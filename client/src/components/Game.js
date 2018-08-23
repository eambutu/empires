import React, {Component} from 'react';
import logo from '../logo.svg';
import '../styles/Game.css';
import Map, {ActionProp} from "./Map";
import EndGame from "./EndGame";
import PlayerBoard from "./PlayerBoard";
import ResourceBoard from "./ResourceBoard";
import Lobby from "./Lobby";

const {SquareType, Costs, UnitType, Action} = require("./config");

const KeyMap = {
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

    isInSpawningRange(y, x, type) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if ((i !== 0 || j !== 0) && this.isInBound(y + i, x + j)) {
                    let square = this.state.squares[y + i][x + j];
                    if (type === UnitType.ATTACKER && square.type === SquareType.BASE && square.baseId === this.state.playerId) {
                        return true;
                    }
                    // Defender square has to have vision and cannot have existing units on it except defenders of your sort
                    if (type === UnitType.DEFENDER && !(square.type === SquareType.UNKNOWN) &&
                        (!square.unit || (this.state.playerId === square.unit.playerId && square.unit.type === UnitType.DEFENDER))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    constructor(props) {
        super(props);
        this.state = {
            playerId: null,
            secret: null,
            squares: null,
            displayShards: 0,
            waiting: true,
            width: 0,
            height: 0,
            cursor: null,
            waitingText: ''
        };
        this.actionQueue = [];
        this.isPlayer = null;

        this.keyDownBound = e => {
            const action = KeyMap[e.key];
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
            if (action && this.state.cursor) {
                let {dy, dx} = ActionProp[action];
                let [cursorY, cursorX, unitId] = this.state.cursor;
                if (unitId === null) {
                    const sq = this.state.squares[cursorY][cursorX];
                    unitId = sq.unit ? sq.unit.id : null;
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
        };

        this.onClickBound = e => {
            let target = e.currentTarget;
            let y = parseInt(target.getAttribute("y"));
            let x = parseInt(target.getAttribute("x"));
            if (e.ctrlKey || e.metaKey) {
                if (this.state.displayShards >= Costs.ATTACKER && this.isInSpawningRange(y, x, UnitType.ATTACKER)) {
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
            }
            else if (e.altKey) {
                if (this.state.displayShards >= Costs.DEFENDER && this.isInSpawningRange(y, x, UnitType.DEFENDER)) {
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
            else if (this.isPlayer[y][x]) {
                let unitId = this.state.squares[y][x].unit.id;
                this.setState({cursor: [y, x, unitId]});
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
            var json = JSON.parse(event.data);
            if (json.event === 'connected') {
                this.setState({
                    playerId: json.playerId,
                    secret: json.secret,
                    waitingText: json.text
                });
            }
            else if (json.event === 'init') {
                this.setState({
                    width: json.width,
                    height: json.height,
                });
            }
            else if (json.event === 'update') {
                this.updateGame(json.state);
            }
            else if (json.event === 'full') {
                this.setState({waitingText: json.text})
            }
            else if (json.event === 'starting') {
                this.setState({waitingText: json.text})
            }
            else if (json.event === 'refresh') {
                window.location.reload()
            }
            else {
            }
        });
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.keyDownBound);
    }

    render() {
        let {squares, playerStatus, playerId, cursor} = this.state;
        console.log(squares);
        if (squares) {
            if (playerStatus[playerId]['status'] === "lost" || playerStatus[playerId]['status'] === "won") {
                return (
                    <div id="game-page">
                        <PlayerBoard playerStatus={this.state.playerStatus}/>

                        <Map squares={squares} actionQueue={[]} cursor={cursor} handleClick={this.onClickBound}/>

                        <EndGame resetClick={this.onReset} exitClick={this.onExit}
                                 status={playerStatus[playerId]['status']}/>
                    </div>

                );
            }
            return (
                <div id="game-page">
                    <PlayerBoard playerStatus={this.state.playerStatus}/>

                    <Map squares={squares} actionQueue={this.actionQueue} cursor={cursor}
                         handleClick={this.onClickBound}/>

                    <ResourceBoard displayShards={this.state.displayShards}/>
                </div>
            );
        }
        else {
            return (
                <Lobby playerStatus={this.state.playerStatus} />
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

        let isPlayer = newState.squares.map(row => {
            return row.map(cell => {
                return cell.unit && cell.unit.playerId === this.state.playerId;
            });
        });
        flattenedPlayerQueue.forEach(move => {
            if (move.action.includes("move")) {
                let [y, x] = move.source;
                if (isPlayer[y][x]) {
                    isPlayer[y][x] = false;
                    let [newY, newX] = move.target;
                    isPlayer[newY][newX] = true;
                }
            }
            else if (move.action === "spawn") {
                let [newY, newX] = move.target;
                isPlayer[newY][newX] = true;
            }
        });

        this.isPlayer = isPlayer;

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
