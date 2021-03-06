import React, {Component} from 'react';
import '../styles/Game.css';
import Chat from './Chat';
import Map, {ActionProp} from "./Map";
import EndGame from "./EndGame";
import PlayerBoard from "./PlayerBoard";
import ResourceBoard from "./ResourceBoard";
import Instructions from "./Instructions";
import Lobby from "./Lobby";
import Tutorial from "./Tutorial";
import GlobalQueue from "./GlobalQueue";
import sword from "../sword.svg";
import startsound from "../startsound.wav"
import redkeyboard from "../redkeyboard.svg";

const {SquareType, Costs, UnitType, Action, ReadyType, GameType, RoomType, LobbyState} = require("./config");

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

let audio = new Audio(startsound);

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
            squares: null,
            queue: [],
            displayShards: 0,
            width: 0,
            height: 0,
            cursor: [null, null, null],
            spawnSquare: null,
            isSpawnDefender: false,
            insufficientShards: false,
            flags: null,
            unitIdQueue: [],
            playerStatus: {},

            lobbyState: null,
            allClientStatus: {},
            gameType: null,
            forceStartSec: null,
            waitingSec: null,
            isSplit: false,
            gameId: 0,
        };
    }

    constructor(props) {
        super(props);
        this.state = this.getInitialState();
        this.unitSquareMap = null;
        this.turnsInsufficientShards = 0;  // Number of turns the shards have flashed red
        this.maxTurnsInsufficientShards = 2;  // Total number of turns the shards should flash red

        this.onMouseOverDuel = () => {
            document.getElementById("gamedescription").innerText = "Duel: Take over your opponent's base to win."
            document.getElementById("gamedescription").style.visibility = "visible";
        }

        this.onMouseAwayDuel = () => {
            document.getElementById("gamedescription").style.visibility = "hidden";
        }

        this.onMouseOverCTF = () => {
            document.getElementById("gamedescription").innerText = "Capture The Flag: Capture the flags to win"
            document.getElementById("gamedescription").style.visibility = "visible";
        }

        this.onMouseAwayCTF = () => {
            document.getElementById("gamedescription").style.visibility = "hidden";
        }

        this.goToHomeMenuAndClose = e => {
            this.ws.close();
            props.goToHomeMenu();
        }

        this.validateUnitIdQueue = e => {
            let cleanUnitIdQueue = this.state.unitIdQueue.filter(unitId => {
                return (this.getUnitIdLoc(unitId)[0] !== null);
            });
            this.setState({
                unitIdQueue: cleanUnitIdQueue
            });
        }

        this.updateUnitIdQueue = unitId => {
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

        this.cycleUnitIdQueueAndMoveCursor = e => {
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

        this.freeCursor = e => {
            let [y, x, cursorUnitId] = this.state.cursor;
            this.setState({
                cursor: [y, x, null]
            });
        }

        this.resetCursorToSpawn = e => {
            let [spawnY, spawnX] = this.state.spawnSquare;
            let unitId = this.state.squares[spawnY][spawnX].unit.id;
            this.updateUnitIdQueue(unitId);
            this.setState({
                cursor: [spawnY, spawnX, unitId]
            });
        }

        this.resetCursorToUnitQueueTail = unitId => {
            let [locY, locX] = this.getUnitIdQueueTailLoc(unitId);

            if (locY !== null) {
                this.setState({
                    cursor: [locY, locX, unitId]
                });
            } else {
                this.freeCursor();
            }
        }

        this.getUnitIdQueueTailLoc = unitId => {
            let unitIdQueue = this.state.queue.filter(move => {
                return move.unitId === unitId;
            })
            if (unitIdQueue.length > 0) {
                return unitIdQueue[unitIdQueue.length - 1].target;
            } else {
                return this.getUnitIdLoc(unitId);
            }
        }

        this.getUnitIdLoc = unitId => {
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
            if (e.key === "=") {
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
            } else if (e.key === "-") {
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
                        unitId: unitId,
                        split: this.state.isSplit
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
            } else if (e.key === "Control" || e.key === "Meta") {
                this.setState({isSpawnDefender: true});
            }

            // Pressing "r" turns on split mode, any other key cancels split mode
            if (e.key === "r") {
                this.setState({isSplit: true});
            } else {
                this.setState({isSplit: false});
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
            if (e.type === 'click') { // left click
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
            } else if (e.type === 'contextmenu') { // context menu is for right click
                e.preventDefault();
                let [cursorY, cursorX, unitId] = this.state.cursor;
                if (unitId === null) {
                    const sq = this.state.squares[cursorY][cursorX];
                    unitId = (sq.unit && sq.unit.type !== UnitType.DEFENDER && sq.unit.playerId === this.state.playerId) ? sq.unit.id : null;
                }
                let moves = this.getPath([y, x], [cursorY, cursorX]);
                if (moves && moves.length > 0 && this.state.squares[y][x].type !== SquareType.RIVER) {
                    moves.forEach(move => {
                        move.action = "move";
                        move.unitId = unitId;
                        move.split = false; // don't split after the first move
                    });
                    moves[0].split = this.state.isSplit; // split on first move if necessary
                    this.setState({cursor: [y, x, unitId]});
                    this.updateUnitIdQueue(unitId);
                    moves.forEach(move => this.sendMove(move));
                }
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

        this.onReleaseMap = e => {
            downFlag = false;
        }
    }

    getValidNeighbors(y, x, walkGrid) {
        return [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]]
            .filter(([ny, nx]) => (walkGrid[ny] && walkGrid[ny][nx] // check bounds
                && walkGrid[ny][nx].walkable // check if can walk on here
                && !walkGrid[ny][nx].prev // check if seen previously
            ));
    }

    getPath(target, source) {
        let isWalkable = function (square) {
            let unit = square.unit;
            return square.type !== SquareType.RIVER && !(unit && unit.type === UnitType.DEFENDER && unit.playerId === this.state.playerId);
        }
        let walkGrid = this.state.squares.map(row => row.map(square => ({walkable: isWalkable.bind(this)(square)})));
        let [sy, sx] = target;
        let [ty, tx] = source;

        let queue = [target]; // BFS from target to source
        walkGrid[sy][sx].prev = -1; // set prev of the target to be -1
        let i = 0;
        while (!walkGrid[ty][tx].prev) {
            if (i >= queue.length) {
                // Target is unreachable
                return null;
            }
            let [y, x] = queue[i++];
            this.getValidNeighbors(y, x, walkGrid).forEach(([ny, nx]) => {
                walkGrid[ny][nx].prev = [y, x];
                queue.push([ny, nx]);
            });
        }
        let path = [];
        let [y, x] = source;
        while (walkGrid[y][x].prev !== -1) {
            let move = {
                source: [y, x],
                target: walkGrid[y][x].prev
            };
            [y, x] = move.target;
            path.push(move);
        }
        return path;
    }

    setUpWebSocket(wsPath) {
        this.ws = new WebSocket(wsPath);

        this.togglePlayerReady = e => {
            this.ws.send(JSON.stringify({'event': 'toggleReady'}));
        }

        this.changeGameType = type => {
            this.ws.send(JSON.stringify({'event': 'changeGame', 'gameType' : type}))
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

        this.onReplay = e => {
            this.ws.close();
            window.location.replace('/replay/' + this.state.gameId.toString());
        };

        this.onVeil = e => {
            this.ws.send(JSON.stringify({'event': 'veil'}));
        };

        this.ws.addEventListener('message', event => {
            let data = JSON.parse(event.data);
            console.log(data.event);
            if (data.event === 'connected') {
                this.setState({
                    playerId: data.playerId,
                    lobbyState: LobbyState.CONNECTED,
                    gameType: data.defaultGameType
                });
            } else if (data.event === 'setAllClientStatus') {
                this.setState({allClientStatus: data.allClientStatus});
            } else if (data.event === 'setGameType') {
                this.setState({gameType: data.gameType});
            } else if (data.event === 'init') {
                this.setState({
                    width: data.width,
                    height: data.height,
                    playerIds: data.playerIds,
                    spawnSquare: data.spawn,
                    cursor: [data.spawn[0], data.spawn[1], null],
                    gameId: data.gameId,
                });
                document.addEventListener("keydown", this.keyDownBound);
                document.addEventListener("keyup", this.keyUpBound);
            } else if (data.event === 'update') {
                this.updateGame(data.state);
            } else if (data.event === 'starting') {
                audio.play();
                this.setState({lobbyState: LobbyState.STARTING});
            } else if (data.event === 'full') {
                this.setState({lobbyState: LobbyState.FULL});
                setInterval(() => window.location.replace('/room'), 5000);
            } else if (data.event === 'noSession') {
                this.setState({lobbyState: LobbyState.NO_SESSION});
                setInterval(() => window.location.replace('/'), 5000);
            } else if (data.event === 'forceStartSec') {
                this.setState({forceStartSec: data.seconds});
            } else if (data.event === 'waitingSec') {
                this.setState({waitingSec: data.seconds});
            }
        });
    }

    componentDidMount() {
        let pathname;
        switch (this.props.roomType) {
            case RoomType.FFA:
                pathname = '/ffa';
                break;
            case RoomType.TUTORIAL:
                pathname = '/tutorial';
                break;
            default:
                pathname = window.location.pathname;
        }
        let wsPath = 'ws://' + window.location.hostname + ':5000' + pathname;
        this.setUpWebSocket(wsPath);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.keyDownBound);
        document.removeEventListener("keyup", this.keyUpBound);
    }

    render() {
        let {forceStartSec, waitingSec, allClientStatus, squares, queue, playerStatus, playerId, playerIds, cursor, isSpawnDefender, flags, lobbyState} = this.state;
        let {roomType} = this.props;
        if (squares) { // in game or after game
            switch (roomType) {
                case RoomType.TUTORIAL:
                    return (
                        <div id="game-page">
                            <Tutorial
                                onReleaseMap={this.onReleaseMap}
                                onDragMap={this.onDragMap}
                                onClickMap={this.onClickMap}
                                displayShards={this.state.displayShards}
                                insufficientShards={this.state.insufficientShards}
                                onVeil={this.onVeil}
                                exitClick={this.goToHomeMenuAndClose}
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
                                gameType={this.state.gameType}
                            />
                        </div>
                    );
                default:
                    let gameInProgress = !['won', 'lost'].includes(playerStatus[playerId]['status']);
                    return (
                        <div id="game-page">
                            <PlayerBoard gameType={this.state.gameType} playerIds={playerIds} flags={flags} playerStatus={playerStatus} isReplay={false}/>

                            <Map
                                onReleaseMap={this.onReleaseMap}
                                onDragMap={this.onDragMap}
                                onClickMap={this.onClickMap}
                                playerId={playerId}
                                playerIds={playerIds}
                                squares={squares}
                                queue={gameInProgress ? queue : []}
                                cursor={cursor}
                                handleClick={gameInProgress ? this.onClickBound : undefined}
                                isSpawnDefender={isSpawnDefender}
                                isInSpawningRange={this.isInSpawningRange.bind(this)}
                            />

                            {gameInProgress ? undefined :
                                <EndGame resetClick={this.onPlayAgain}
                                         exitClick={this.goToHomeMenuAndClose}
                                         status={playerStatus[playerId]['status']}
                                         canPlayAgain={!(this.props.roomType === RoomType.TUTORIAL)}
                                         onReplay={this.onReplay}/>}

                            <ResourceBoard displayShards={this.state.displayShards} insufficientShards={this.state.insufficientShards}/>
                        </div>
                    );
            }
        } else { // in lobby
            switch (roomType) {
                case RoomType.TUTORIAL:
                    return (
                        <div className="center">
                            <img src={sword} className="App-logo-no-click" alt="logo"/>
                            <div className="title">squarecraft.io</div>
                            <div className="App-text">
                                Tutorial is loading...
                            </div>
                        </div>
                    );
                case RoomType.FFA:
                    return (
                        <div>
                            <GlobalQueue
                                roomType={this.props.roomType}
                                lobbyState={lobbyState}
                                playerId={playerId}
                                togglePlayerReady={this.togglePlayerReady}
                                forceStartSec={forceStartSec}
                                waitingSec={waitingSec}
                                statuses={allClientStatus}
                                goToHomeMenu={this.goToHomeMenuAndClose} />
                            <Chat messages={this.props.chatMessages} onChatMessage={this.props.onChatMessage} />
                        </div>
                    );
                case RoomType.CUSTOM:
                    return (
                        <Lobby
                            roomType={this.props.roomType}
                            lobbyState={lobbyState}
                            gameType={this.state.gameType}
                            changeGameType={this.changeGameType}
                            onMouseAwayDuel={this.onMouseAwayDuel}
                            onMouseOverDuel={this.onMouseOverDuel}
                            onMouseAwayCTF={this.onMouseAwayCTF}
                            onMouseOverCTF={this.onMouseOverCTF}
                            playerId={playerId}
                            statuses={allClientStatus}
                            waitingSec={waitingSec}
                            togglePlayerReady={this.togglePlayerReady}
                            playerIds={playerIds}
                            playerStatus={playerStatus} />
                    );
                default:
                    return null;
            }
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
        this.ws.send(JSON.stringify(
            {
                'event': 'move',
                'move': move,
            }
        ));
    }
}

export default Game;
