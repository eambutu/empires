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

class Game extends Component {
    isInBound(y, x) {
        return (0 <= y && y < this.state.height) && (0 <= x && x < this.state.width);
    }

    isInSpawningRange(y, x) {
        // Defender square has to have vision and cannot have existing units on it except defenders of your sort
        // Also, don't allow spawning defenders on your own spawn square
        let square = this.state.squares[y][x];
        if (!(square.type === SquareType.UNKNOWN) &&
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
            displayShards: 0,
            waiting: true,
            width: 0,
            height: 0,
            cursor: null,
            waitingText: '',
            canPlayAgain: true,
            spawnSquare: null,
            isTutorial: false
        };
        this.actionQueue = [];
        this.unitSquareMap = null;

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
            }
            else if (e.key === "-"){
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
            if (e.key in MoveKeyMap && this.state.cursor) {
                const action = MoveKeyMap[e.key];
                let {dy, dx} = ActionProp[action];
                let [cursorY, cursorX, unitId] = this.state.cursor;
                if (unitId === null) {
                    const sq = this.state.squares[cursorY][cursorX];
                    unitId = (sq.unit && sq.unit.type !== UnitType.DEFENDER) ? sq.unit.id : null;
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
            }
            else if (e.key === " " || e.key === "Spacebar") {
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
            } else if (e.key === "c") {
                let move = {
                    action: "cancelQueue"
                };
                this.sendMove(move);
            }
        };

        this.onClickBound = e => {
            let target = e.currentTarget;
            let y = parseInt(target.getAttribute("y"));
            let x = parseInt(target.getAttribute("x"));
            if (e.altKey) {
                if (this.state.displayShards >= Costs.DEFENDER && this.isInSpawningRange(y, x)) {
                    let move = {
                        "action": "spawn",
                        "target": [y, x],
                        "type": UnitType.DEFENDER
                    };
                    this.setState({
                        cursor: [y, x, null],
                        displayShards: this.state.displayShards - Costs.DEFENDER
                    });
                    this.sendMove(move);
                }
            }
            else if (this.unitSquareMap[y][x]) {
                this.setState({cursor: [y, x, this.unitSquareMap[y][x]]});
            }
        };
    }

    componentDidMount() {
        document.addEventListener("keydown", this.keyDownBound);

        this.ws = new WebSocket('ws://' + window.location.hostname + ':5000' + window.location.pathname);

        this.onReset = e => {
            this.ws.send(JSON.stringify({'event': 'reset'}));
        };

        this.onExit = e => {
            this.ws.send(JSON.stringify({'event': 'exit'}));
        };

        this.ws.addEventListener('message', event => {
            var data = JSON.parse(event.data);
            if (data.event === 'connected') {
                this.setState({
                    playerId: data.playerId,
                    secret: data.secret,
                    waitingText: data.text,
                    isTutorial: data.isTutorial
                });
            }
            else if (data.event === 'init') {
                this.setState({
                    width: data.width,
                    height: data.height,
                    playerIds: data.playerIds,
                    spawnSquare: data.spawn
                });
            }
            else if (data.event === 'update') {
                this.updateGame(data.state);
            }
            else if (data.event === 'full') {
                this.setState({waitingText: data.text})
            }
            else if (data.event === 'starting') {
                this.setState({waitingText: data.text})
            }
            else if (data.event === 'redirect') {
                window.location.replace('/')
            }
            else if (data.event === 'noPlayAgain') {
                this.setState({canPlayAgain: false})
            }
            else {
            }
        });
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.keyDownBound);
    }

    render() {
        let {squares, playerStatus, playerId, playerIds, cursor, canPlayAgain, tutorial} = this.state;
        console.log(this.state.isTutorial);
        if (this.state.isTutorial && squares){

            return (
                <div id="game-page">
                    <Tutorial playerId={playerId} playerIds={playerIds} playerStatus={playerStatus} squares={squares} actionQueue={[]} cursor={cursor} handleClick={this.onClickBound}/>
                </div>

            );
        }
        if (squares) {
            if (playerStatus[playerId]['status'] === "lost" || playerStatus[playerId]['status'] === "won") {
                return (
                    <div id="game-page">
                        <PlayerBoard playerStatus={this.state.playerStatus}/>

                        <Map playerId={playerId} playerIds={playerIds} squares={squares} actionQueue={[]} cursor={cursor} handleClick={this.onClickBound}/>

                        <EndGame resetClick={this.onReset} exitClick={this.onExit}
                                 status={playerStatus[playerId]['status']} canPlayAgain={canPlayAgain}/>
                    </div>
                );
            }
            return (
                <div id="game-page">
                    <PlayerBoard playerStatus={this.state.playerStatus}/>

                    <Map playerIds={playerIds} squares={squares} actionQueue={this.actionQueue} cursor={cursor}
                         handleClick={this.onClickBound}/>

                    <ResourceBoard displayShards={this.state.displayShards}/>
                </div>
            );
        }
        else {
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

        this.actionQueue = flattenedPlayerQueue;

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
                }
                else if (move.type === UnitType.DEFENDER) {
                    displayShards -= Costs.DEFENDER;
                }
            }
        });
        this.setState({
            displayShards: displayShards,
            squares: newState.squares,
            playerStatus: newState.playerStatus
        });
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
