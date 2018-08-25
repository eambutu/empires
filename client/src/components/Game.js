import React, {Component} from 'react';
import * as Cookies from 'js-cookie';
import '../styles/Game.css';
import Map, {ActionProp} from "./Map";
import EndGame from "./EndGame";
import PlayerBoard from "./PlayerBoard";
import ResourceBoard from "./ResourceBoard";
import Lobby from "./Lobby";
import Tutorial from "./Tutorial";
import GlobalQueue from "./GlobalQueue";

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

let backsize = 25;
let squaresize = 35;

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
        let [cursorY, cursorX, cursorUnitId] = this.state.cursor;
        return (0 <= y && y < this.state.height) && (0 <= x && x < this.state.width) && (!cursorUnitId || (this.state.squares[y][x].type !== SquareType.RIVER));
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

    getInitialState() {
        return {
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
            spawnSquare: null,
            isSpawnDefender: false,
            insufficientShards: false,
            flags: null,
            unitIdQueue: []
        };
    }

    constructor(props) {
        super(props);
        this.state = this.getInitialState();
        this.unitSquareMap = null;
        this.turnsInsufficientShards = 0;  // Number of turns the shards have flashed red
        this.maxTurnsInsufficientShards = 2;  // Total number of turns the shards should flash red

        this.validateUnitIdQueue = function() {
            let cleanUnitIdQueue = this.state.unitIdQueue.filter(unitId => {
                return (this.getUnitIdLoc(unitId)[0] !== null);
            });
            this.setState({
                unitIdQueue: cleanUnitIdQueue
            });
        }

        this.updateUnitIdQueue = function(unitId) {
            if (unitId) {
                let newUnitIdQueue = this.state.unitIdQueue;
                let ix = newUnitIdQueue.indexOf(unitId);

                if (ix > -1) {
                    newUnitIdQueue.splice(ix, 1)
                    newUnitIdQueue = [unitId].concat(newUnitIdQueue);
                } else {
                    newUnitIdQueue.unshift(unitId);
                }

                this.setState({
                    unitIdQueue: newUnitIdQueue
                });
            }
        }

        this.cycleUnitIdQueueAndMoveCursor = function() {
            let newUnitIdQueue = this.state.unitIdQueue;
            if (newUnitIdQueue.length > 0) {
                let currentUnitId = newUnitIdQueue.shift();
                newUnitIdQueue.push(currentUnitId);
                this.setState({
                    unitIdQueue: newUnitIdQueue
                });
                this.resetCursorToUnitQueueTail(newUnitIdQueue[0]);
            } else {
                this.freeCursor();
            }
        }

        this.freeCursor = function() {
            let [y, x, cursorUnitId] = this.state.cursor;
            this.setState({
                cursor: [y, x, null]
            });
        }

        this.resetCursorToSpawn = function() {
            let [spawnY, spawnX] = this.state.spawnSquare;
            this.setState({
                cursor: [spawnY, spawnX, null]
            });
        }

        this.resetCursorToUnitQueueTail = function(unitId) {
            let [locY, locX] = this.getUnitIdQueueTailLoc(unitId);

            if (locY !== null) {
                this.setState({
                    cursor: [locY, locX, unitId]
                });
            } else {
                this.freeCursor();
            }
        }

        this.getUnitIdQueueTailLoc = function(unitId) {
            let unitIdQueue = this.state.queue.filter(move => {
                return move.unitId === unitId;
            })
            if (unitIdQueue.length > 0) {
                return unitIdQueue[unitIdQueue.length - 1].target;
            } else {
                return this.getUnitIdLoc(unitId);
            }
        }

        this.getUnitIdLoc = function(unitId) {
            let locY = null;
            let locX = null
            this.state.squares.forEach((row, y) => {
                row.forEach((square, x) => {
                    if (square.unit && square.unit.id === unitId){
                        locY = y;
                        locX = x;
                    }
                })
            })
            return [locY, locX];
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
                    this.updateUnitIdQueue(unitId);
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
                    this.sendMove(move);
                }
                else {
                    this.setState({
                        insufficientShards: true,
                    });
                }
            } else if (e.key === "e") {
                this.cycleUnitIdQueueAndMoveCursor();
            } else if (e.key === "q") {
                let [y, x, cursorUnitId] = this.state.cursor;
                let move = {
                    action:"cancelUnitQueue",
                    unitId: cursorUnitId
                }
                this.sendMove(move);
            } else if (e.key === "c") {
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
                this.updateUnitIdQueue(this.unitSquareMap[y][x]);
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

        this.onPlayerReady = () => {
            // abhi do your shit here

            // also don't forget you need to pass the names of all the players in the lobby into playerids earlier so i can
            // render their names and whatnot

            // so do that

            // luv u

            console.log("im ready!");

        }
    }

    setUpWebSocket(wsPath) {
        this.ws = new WebSocket(wsPath);
        let session = Cookies.get('session');
        if (!this.props.isTutorial) {
            this.ws.onopen = () => {
                console.log('WebSocket opened, sending session');
                this.ws.send(JSON.stringify({
                    event: 'verify',
                    session: session
                }));
            };
        }

        this.onPlayAgain = e => {
            this.ws.close();
            this.setState(this.getInitialState());
            this.setUpWebSocket(wsPath); // wsPath is still the queued game
            document.removeEventListener("keydown", this.keyDownBound);
            document.removeEventListener("keyup", this.keyUpBound);
        };

        this.onExit = e => {
            this.ws.close();
            window.location.replace('/');
        };

        this.onVeil = () => {
            this.ws.send(JSON.stringify({'event': 'veil'}));
        }

        this.ws.addEventListener('message', event => {
            let data = JSON.parse(event.data);
            // console.log(data.event);
            if (data.event === 'connected') {
                let connectedText = 'Connected! Waiting for other players to join.'
                if (this.props.isTutorial) {
                    connectedText = 'Connected! Welcome to the tutorial.'
                }

                this.setState({
                    playerId: data.playerId,
                    secret: data.secret,
                    waitingText: connectedText
                });
            } else if (data.event === 'init') {
                this.setState({
                    width: data.width,
                    height: data.height,
                    playerIds: data.playerIds,
                    spawnSquare: data.spawn,
                    cursor: [data.spawn[0], data.spawn[1], null],
                });
                document.addEventListener("keydown", this.keyDownBound);
                document.addEventListener("keyup", this.keyUpBound);
            } else if (data.event === 'update') {
                this.updateGame(data.state);
            } else if (data.event === 'starting') {
                let startingText = 'Starting game...'
                if (this.props.isTutorial) {
                    startingText = 'Starting tutorial...'
                }
                this.setState({waitingText: startingText})
            } else if (data.event === 'full') {
                this.ws.close();
                let fullText = 'This room is full. Redirecting to lobbies page in 5 seconds...'
                this.setState({waitingText: fullText});
                setInterval(
                    function() {window.location.replace('/room');},
                    5000
                );
            }
        });
    }

    componentDidMount() {
        let pathname;
        if (this.props.ffa) {
            pathname = '/ffa';
        } else {
            pathname = window.location.pathname;
        }
        let wsPath = 'ws://' + window.location.hostname + ':5000' + pathname
        this.setUpWebSocket(wsPath);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.keyDownBound);
        document.removeEventListener("keyup", this.keyUpBound);
    }

    render() {
        let {squares, queue, playerStatus, playerId, playerIds, cursor, isSpawnDefender, flags} = this.state;
        if (this.props.isTutorial && squares){
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
                        flags={flags}
                    />
                </div>
            );
        }
        if (squares) {
            if (playerStatus[playerId]['status'] === "lost" || playerStatus[playerId]['status'] === "won") {
                return (
                    <div id="game-page">
                        <PlayerBoard ffa={this.props.ffa} playerIds={playerIds} flags={flags} playerStatus={playerStatus}/>

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

                        <EndGame resetClick={this.onPlayAgain}
                                 exitClick={this.onExit}
                                 status={playerStatus[playerId]['status']}
                                 canPlayAgain={!this.props.isTutorial} />
                    </div>
                );
            }
            return (
                <div id="game-page">
                    <PlayerBoard ffa={this.props.ffa} playerIds={playerIds} flags={flags} playerStatus={playerStatus}/>

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
        } else if (this.props.ffa) {
            return (
                <GlobalQueue goToHomeMenu ={this.props.goToHomeMenu} />
            )
        }
        else {
            return (
                <Lobby onPlayerReady={this.onPlayerReady} playerIds={playerIds} playerStatus={playerStatus} waitingText={this.state.waitingText} />
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
            insufficientShards: iShards,
            flags: newState.flags
        });

        let [cursorY, cursorX, cursorUnitId] = this.state.cursor;
        if ((cursorUnitId in newState.trimmed) && newState.trimmed[cursorUnitId]) {
            this.resetCursorToUnitQueueTail(cursorUnitId);
        }

        if (newState.spawned) {
            this.resetCursorToSpawn();
        }

        this.validateUnitIdQueue();
    }

    sendMove(move) {
        // console.log("Sent move", move);
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
