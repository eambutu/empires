import React, {Component} from 'react';
import logo from '../logo.svg';
import '../styles/Game.css';
import Map, {ActionProp} from "./Map";
import EndGame from "./EndGame";
import PlayerBoard from "./PlayerBoard";
import ResourceBoard from "./ResourceBoard";

const {SquareType, AttackerCost, Action} = require("./config");

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

class Game extends Component {
    isInBound(y, x) {
        return (0 <= y && y < this.state.height) && (0 <= x && x < this.state.width);
    }

    isInSpawningRange(y, x) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if ((i !== 0 || j !== 0) && this.isInBound(y + i, x + j)) {
                    if (this.state.player === 1 && this.state.squares[y + i][x + j].squareType === SquareType.BASE1) {
                        return true;
                    }
                    if (this.state.player === 2 && this.state.squares[y + i][x + j].squareType === SquareType.BASE2) {
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
            player: null,
            secret: null,
            squares: null,
            shards: 0,
            playerStatus: null,
            width: 0,
            height: 0,
            cursor: null,
            waitingText: ''
        };
        this.actionQueue = [];
        this.isPlayer = null;
        this.shardsDelta = 0;

        this.keyDownBound = e => {
            const action = KeyMap[e.key];
            if (action && this.state.cursor) {
                let {dy, dx} = ActionProp[action];
                let [cursorY, cursorX] = this.state.cursor;
                let targetY = cursorY + dy;
                let targetX = cursorX + dx;
                if (this.isInBound(targetY, targetX)) {
                    let target = [targetY, targetX];
                    let move = {
                        action: action,
                        source: this.state.cursor,
                        target: target,
                        id: new Date().toString()
                    };
                    this.setState({cursor: target});
                    this.sendMove(move);
                }
            }
        };

        this.onClickBound = e => {
            let target = e.currentTarget;
            let y = parseInt(target.getAttribute("y"));
            let x = parseInt(target.getAttribute("x"));
            if (e.ctrlKey || e.metaKey) {
                if (this.state.shards + this.shardsDelta >= AttackerCost && this.isInSpawningRange(y, x)) {
                    this.shardsDelta -= AttackerCost;
                    let move = {
                        "action": "spawn",
                        "target": [y, x]
                    };
                    this.setState({cursor: [y, x]});
                    this.sendMove(move);
                }
            }
            else if (this.isPlayer[y][x]) {
                this.setState({cursor: [y, x]});
            }
        };
    }

    componentDidMount() {
        // Call our fetch function below once the component mounts
        // this.callBackendAPI()
        //     .then(res => this.setState({ squares: res.squares }))

        document.addEventListener("keydown", this.keyDownBound);

        this.ws = new WebSocket('ws://' + window.location.hostname + ':5000/');

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
                    player: json.player,
                    secret: json.secret,
                    waitingText: json.text
                });
            }
            else if (json.event === 'init') {
                this.setState({
                    width: json.width,
                    height: json.height,
                })
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

    // Fetches our GET route from the Express server. (Note the route we are fetching matches the GET route from server.js
    callBackendAPI = async () => {
        const response = await fetch('/game_state');
        const body = await response.json();

        if (response.status !== 200) {
            throw Error(body.message)
        }
        return body;
    };

    render() {
        let {squares, playerStatus, player, cursor} = this.state;
        if (squares) {
            if (playerStatus[player]['status'] === "lost" || playerStatus[player]['status'] === "won") {
                return (
                    <div id="game-page">
                        <PlayerBoard playerStatus={this.state.playerStatus}/>

                        <Map squares={squares} actionQueue={[]} cursor={cursor} handleClick={this.onClickBound}/>

                        <EndGame resetClick={this.onReset} exitClick={this.onExit}
                                 status={playerStatus[player]['status']}/>
                    </div>

                );
            }
            return (
                <div id="game-page">
                    <PlayerBoard playerStatus={this.state.playerStatus}/>

                    <Map squares={squares} actionQueue={this.actionQueue} cursor={cursor}
                         handleClick={this.onClickBound}/>

                    <ResourceBoard shards={this.state.shards}/>
                </div>
            );
        }
        else {
            return (
                <div>{this.state.waitingText}</div>
            )
        }
    }

    updateGame(newState) {
        this.actionQueue = newState.queue;

        let isPlayer = newState.squares.map(row => {
            return row.map(cell => {
                return cell.unit && cell.unit.playerId === this.state.player;
            });
        });

        this.isPlayer = isPlayer;

        let newCursor = this.state.cursor;
        // if (newCursor) {
        //     let [y, x] = newCursor;
        //     if (!isPlayer[y][x]) {
        //         newCursor = null;
        //     }
        // }

        this.setState({
            shards: newState.shards,
            squares: newState.squares,
            playerStatus: newState.playerStatus,
            cursor: newCursor
        });
        this.shardsDelta = 0;
    }

    sendMove(move) {
        this.ws.send(JSON.stringify(
            {
                'event': 'move',
                'secret': this.state.secret,
                'move': move,
                'shardsDelta': this.shardsDelta
            }
        ));
    }
}

export default Game;
