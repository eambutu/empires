import React, {Component} from 'react';
import logo from '../logo.svg';
import '../styles/Game.css';
import Map, {ActionProp} from "./Map";
import EndGame from "./EndGame";
import PlayerBoard from "./PlayerBoard";
import ResourceBoard from "./ResourceBoard";
import Lobby from "./Lobby";
import Tutorial from "./Tutorial";

const {SquareType, Costs, UnitType, Action} = require("./config");

const MoveKeyMap = {
    ArrowDown: Action.MOVE_DOWN,
    ArrowUp: Action.MOVE_UP,
    ArrowLeft: Action.MOVE_LEFT,
    ArrowRight: Action.MOVE_RIGHT,
    s: Action.MOVE_DOWN,
    w: Action.MOVE_UP,
    a: Action.MOVE_LEFT,
    d: Action.MOVE_RIGHT
};

let backsize = 42;
let squaresize = 52;

let mousepos = {
    x: null,
    y: null
}

let initMapPos = {
    x: null,
    y: null
}

let downFlag = false;

class Game extends Component {
    isInBound(y, x) {
        return (0 <= y && y < this.state.height) && (0 <= x && x < this.state.width);
    }

    isInSpawningRange(y, x) {
        // Defender square has to have vision and cannot have existing units on it except defenders of your sort
        // Cannot spawn on enemy base
        // Also, don't allow spawning defenders on your own spawn square
        let square = this.state.squares[y][x];
        if (!(square.type === SquareType.UNKNOWN) && !(square.type === SquareType.RIVER) && !square.isFog &&
            (square.type !== SquareType.BASE || square.baseId === this.state.playerId) &&
            (!square.unit || (this.state.playerId === square.unit.playerId && square.unit.type === UnitType.DEFENDER)) &&
            !(y === this.state.spawnSquare[0] && x === this.state.spawnSquare[1])) {
            return true;
        }
        return false;
    }

    constructor(props) {
        super(props);
        this.state = {
            playerIds: [],
            playerId: null,
            secret: null,
            squares: null,
            queue: [],
            displayShards: 0,
            waiting: true,
            width: 0,
            height: 0,
            cursor: [null, null, null],
            waitingText: '',
            canPlayAgain: true,
            spawnSquare: null,
            isSpawnDefender: false,
            isTutorial: false,
            insufficientShards: false
        };
        this.unitSquareMap = null;
        this.turnsInsufficientShards = 0;  // Number of turns the shards have flashed red
        this.maxTurnsInsufficientShards = 2;  // Total number of turns the shards should flash red

        this.freeCursor = function() {
            let [y, x, cursorUnitId] = this.state.cursor;
            this.setState({
                cursor: [y, x, null]
            });
        }

        this.resetUnitQueueCursor = function() {
            let [cursorY, cursorX, cursorUnitId] = this.state.cursor;
            let newY = null;
            let newX = null;

            this.state.squares.forEach((row, y) => {
                row.forEach((square, x) => {
                    if (square.unit && square.unit.id === cursorUnitId){
                        newY = y;
                        newX = x;
                    }
                })
            })

            if (newY && this.state.squares[newY][newX].unit.playerId === this.state.playerId) {
                this.setState({
                    cursor: [newY, newX, cursorUnitId]
                });
            } else {
                this.freeCursor();
            }

        }

        this.keyDownBound = e => {
            if (e.key === "="){
                let all = document.getElementsByClassName('square');
                backsize = Math.min(backsize + 5, 45);
                squaresize = Math.min(squaresize + 5, 55);
                for (let i = 0; i < all.length; i++) {
                    all[i].style.backgroundSize = backsize.toString() + "px " + backsize.toString() + "px";
                    all[i].style.width = squaresize.toString() + "px";
                    all[i].style.height = squaresize.toString() + "px";
                    all[i].style.maxWidth = squaresize.toString() + "px";
                    all[i].style.minWidth = squaresize.toString() + "px";
                    all[i].style.maxHeight = squaresize.toString() + "px";
                    all[i].style.minHeight = squaresize.toString() + "px";

                }
            } else if (e.key === "-"){
                let all = document.getElementsByClassName('square');
                backsize = Math.max(backsize - 5, 25);
                squaresize = Math.max(squaresize - 5, 35);
                for (let i = 0; i < all.length; i++) {
                    all[i].style.backgroundSize = backsize.toString() + "px " + backsize.toString() + "px";
                    all[i].style.width = squaresize.toString() + "px";
                    all[i].style.height = squaresize.toString() + "px";
                    all[i].style.maxWidth = squaresize.toString() + "px";
                    all[i].style.minWidth = squaresize.toString() + "px";
                    all[i].style.maxHeight = squaresize.toString() + "px";
                    all[i].style.minHeight = squaresize.toString() + "px";
                }

            }
            else if (e.key in MoveKeyMap && this.state.cursor) {
                const action = MoveKeyMap[e.key];
                let {dy, dx} = ActionProp[action];
                let [cursorY, cursorX, unitId] = this.state.cursor;
                if (unitId === null) {
                    const sq = this.state.squares[cursorY][cursorX];
                    unitId = (sq.unit && sq.unit.type !== UnitType.DEFENDER && sq.unit.playerId === this.state.playerId) ? sq.unit.id : null;
                }
                let targetY = cursorY + dy;
                let targetX = cursorX + dx;
                if (this.isInBound(targetY, targetX)) {
                    let target = [targetY, targetX];
                    let move = {
                        action: action,
                        source: [cursorY, cursorX],
                        target: target,
                        unitId: unitId
                    };
                    this.setState({cursor: [targetY, targetX, unitId]});
                    this.sendMove(move);
                }
            } else if (e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                let [y, x] = this.state.spawnSquare;
                if (this.state.displayShards >= Costs.ATTACKER) {
                    let move = {
                        "action": "spawn",
                        "target": [y, x],
                        "type": UnitType.ATTACKER
                    };
                    this.setState({
                        cursor: [y, x, null],
                        displayShards: this.state.displayShards - Costs.ATTACKER
                    });
                    this.sendMove(move);
                }
                else {
                    this.setState({
                        insufficientShards: true,
                    });
                }
            } else if (e.key === "q") {
                this.resetUnitQueueCursor();
                let [y, x, cursorUnitId] = this.state.cursor;
                let move = {
                    action:"cancelUnitQueue",
                    unitId: cursorUnitId
                }
                this.sendMove(move);
            } else if (e.key === "c") {
                this.freeCursor();
                let move = {
                    action: "cancelPlayerQueues"
                };
                this.sendMove(move);
            }
            else if (e.key === "Control" || e.key === "Meta") {
                this.setState({isSpawnDefender: true});
            }
        };

        this.keyUpBound = e => {
            if (e.key === "Control" || e.key === "Meta") {
                this.setState({isSpawnDefender: false});
            }
        }

        this.onClickBound = e => {
            let target = e.currentTarget;
            let y = parseInt(target.getAttribute("y"));
            let x = parseInt(target.getAttribute("x"));
            if (e.ctrlKey || e.metaKey) {
                if (this.state.displayShards >= Costs.DEFENDER) {
                    if (this.isInSpawningRange(y, x)) {
                        let move = {
                            "action": "spawn",
                            "target": [y, x],
                            "type": UnitType.DEFENDER
                        };
                        this.setState({
                            displayShards: this.state.displayShards - Costs.DEFENDER
                        });
                        this.sendMove(move);
                    }
                }
                else {
                    this.setState({
                        insufficientShards: true,
                    });
                }
            } else if (this.unitSquareMap[y][x]) {
                this.setState({cursor: [y, x, this.unitSquareMap[y][x]]});
            }
        };

        this.onClickMap = e => {
            downFlag = true;
            // Record click position
            mousepos.x = e.clientX;
            mousepos.y = e.clientY;
            initMapPos.x = document.getElementsByClassName("map")[0].offsetLeft;
            initMapPos.y = document.getElementsByClassName("map")[0].offsetTop;

            document.getElementsByClassName("map")[0].style.position = "absolute";
            document.getElementsByClassName("map")[0].style.top = initMapPos.y + "px";
            document.getElementsByClassName("map")[0].style.left = initMapPos.x + "px";

        }

        this.onDragMap = e => {
            if (downFlag) {
                document.getElementsByClassName("map")[0].style.top = (initMapPos.y + (e.clientY - mousepos.y)) + "px";
                document.getElementsByClassName("map")[0].style.left = (initMapPos.x + (e.clientX - mousepos.x)) + "px";
            }
        }

        this.onReleaseMap = () => {
            downFlag = false;
        }
    }

    componentDidMount() {
        let pathname;
        if (this.props.queuedGame) {
            pathname = '/queue';
        } else {
            pathname = window.location.pathname;
        }
        this.ws = new WebSocket('ws://' + window.location.hostname + ':5000' + pathname);

        this.onReset = e => {
            this.ws.send(JSON.stringify({'event': 'reset'}));
        };

        this.onExit = e => {
            this.ws.send(JSON.stringify({'event': 'exit'}));
        };

        this.onVeil = () => {
            this.ws.send(JSON.stringify({'event': 'veil'}));
        }

        this.ws.addEventListener('message', event => {
            let data = JSON.parse(event.data);
            if (data.event === 'connected') {

                let connectedText = 'Connected! Waiting for other players to join.'
                if (data.isTutorial) {
                    connectedText = 'Connected! Welcome to the tutorial.'
                }

                this.setState({
                    playerId: data.playerId,
                    secret: data.secret,
                    waitingText: connectedText,
                    isTutorial: data.isTutorial
                });
            } else if (data.event === 'init') {
                this.setState({
                    width: data.width,
                    height: data.height,
                    playerIds: data.playerIds,
                    spawnSquare: data.spawn
                });
                document.addEventListener("keydown", this.keyDownBound);
                document.addEventListener("keyup", this.keyUpBound);
            } else if (data.event === 'update') {
                this.updateGame(data.state);
            } else if (data.event === 'full') {
                let fullText = 'Lobby is full. Check back again later.'
                if (this.state.isTutorial) {
                    fullText = 'This tutorial is full. Refresh and try again.'
                }
                this.setState({waitingText: fullText})
            } else if (data.event === 'starting') {
                let startingText = 'Starting game...'
                if (this.state.isTutorial) {
                    startingText = 'Starting tutorial...'
                }
                this.setState({waitingText: startingText})
            } else if (data.event === 'redirect') {
                window.location.replace('/')
            } else if (data.event === 'noPlayAgain') {
                this.setState({canPlayAgain: false})
            }
        });
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.keyDownBound);
    }

    render() {
        let {squares, queue, playerStatus, playerId, playerIds, cursor, canPlayAgain, isSpawnDefender} = this.state;
        if (this.state.isTutorial && squares){

            return (
                <div id="game-page">
                    <Tutorial
                        onReleaseMap={this.onReleaseMap}
                        onDragMap={this.onDragMap}
                        onClickMap={this.onClickMap}
                        displayShards={this.state.displayShards}
                        insufficientShards={this.state.insufficientShards}
                        onVeil={this.onVeil}
                        exitClick={this.onExit}
                        playerId={playerId}
                        playerIds={playerIds}
                        playerStatus={playerStatus}
                        squares={squares}
                        queue={queue}
                        cursor={cursor}
                        handleClick={this.onClickBound}
                        isSpawnDefender={isSpawnDefender}
                        isInSpawningRange={this.isInSpawningRange.bind(this)}
                    />
                </div>


            );
        }
        if (squares) {
            if (playerStatus[playerId]['status'] === "lost" || playerStatus[playerId]['status'] === "won") {
                return (
                    <div id="game-page">
                        <PlayerBoard playerStatus={this.state.playerStatus}/>

                        <Map
                            onReleaseMap={this.onReleaseMap}
                            onDragMap={this.onDragMap}
                            onClickMap={this.onClickMap}
                            playerId={playerId}
                            playerIds={playerIds}
                            squares={squares}
                            queue={[]}
                            cursor={cursor}
                            handleClick={this.onClickBound}
                            isSpawnDefender={isSpawnDefender}
                            isInSpawningRange={this.isInSpawningRange.bind(this)}
                        />

                        <EndGame resetClick={this.onReset} exitClick={this.onExit}
                                 status={playerStatus[playerId]['status']} canPlayAgain={canPlayAgain}/>
                    </div>
                );
            }
            return (
                <div id="game-page">
                    <PlayerBoard playerStatus={this.state.playerStatus}/>

                    <Map
                        onReleaseMap={this.onReleaseMap}
                        onDragMap={this.onDragMap}
                        onClickMap={this.onClickMap}
                        playerId={playerId}
                        playerIds={playerIds}
                        squares={squares}
                        queue={queue}
                        cursor={cursor}
                        handleClick={this.onClickBound}
                        isSpawnDefender={isSpawnDefender}
                        isInSpawningRange={this.isInSpawningRange.bind(this)}
                    />

                    <ResourceBoard displayShards={this.state.displayShards} insufficientShards={this.state.insufficientShards}/>
                </div>
            );
        } else {
            return (
                <Lobby playerStatus={this.state.playerStatus} waitingText={this.state.waitingText} />
            )
        }
    }

    updateGame(newState) {
        // Flattening for now
        let flattenedPlayerQueue = [];
        Object.entries(newState.queues).forEach(([unitId, queue]) => {
            flattenedPlayerQueue.push.apply(flattenedPlayerQueue, queue);
        });

        let unitSquareMap = newState.squares.map(row => {
            return row.map(cell => {
                if (cell.unit && cell.unit.type !== UnitType.DEFENDER && cell.unit.playerId === this.state.playerId) {
                    return cell.unit.id;
                }
                return null;
            });
        });
        flattenedPlayerQueue.forEach(move => {
            // Spawns are instantaneous, so we should only have actions in the flattened queue anyway
            if (move.action.includes("move")) {
                let [y, x] = move.source;
                if (unitSquareMap[y][x]) {
                    let [newY, newX] = move.target;
                    unitSquareMap[newY][newX] = unitSquareMap[y][x];
                    unitSquareMap[y][x] = null;
                }
            }
        });

        this.unitSquareMap = unitSquareMap;

        let displayShards = newState.shards;
        flattenedPlayerQueue.forEach(move => {
            if (move.action === "spawn") {
                if (move.type === UnitType.ATTACKER) {
                    displayShards -= Costs.ATTACKER;
                } else if (move.type === UnitType.DEFENDER) {
                    displayShards -= Costs.DEFENDER;
                }
            }
        });

        let iShards = false;
        if (this.state.insufficientShards) {
            this.turnsInsufficientShards++;
            if (this.turnsInsufficientShards === this.maxTurnsInsufficientShards) {
                this.turnsInsufficientShards = 0;
            }
            else {
                iShards = true;
            }
        }

        this.setState({
            queue: flattenedPlayerQueue,
            displayShards: displayShards,
            squares: newState.squares,
            playerStatus: newState.playerStatus,
            insufficientShards: iShards
        });

        let [cursorY, cursorX, cursorUnitId] = this.state.cursor;
        if ((cursorUnitId in newState.trimmed) && newState.trimmed[cursorUnitId]) {
            this.resetUnitQueueCursor();
        }
    }

    sendMove(move) {
        console.log("Sent move", move);
        this.ws.send(JSON.stringify(
            {
                'event': 'move',
                'secret': this.state.secret,
                'move': move,
            }
        ));
    }
}

export default Game;
