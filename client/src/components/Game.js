import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Game.css';
import Map from "./Map";
import EndGame from "./EndGame";

const keyMap = {
    ArrowDown: { dx: 0, dy: 1 },
    ArrowUp: { dx: 0, dy: -1 },
    ArrowLeft: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 }
};

class Game extends Component {
    isInBound(y, x) {
        return (0 <= y && y < this.state.height) && (0 <= x && x < this.state.width);
    }

    constructor(props) {
        super(props);
        this.state = {
            player: null,
            secret: null,
            squares: null,
            playerStatus: null,
            width: 0,
            height: 0,
            cursor: null,
            waitingText: 'Waiting for players to join'
        };
        this.actionQueue = [];
        this.isPlayer = null;

        this.keyDownBound = e => {
            console.log(e.key);
            const dPos = keyMap[e.key];
            if (dPos && this.state.cursor) {
                let [cursorY, cursorX] = this.state.cursor;
                let targetY = cursorY + dPos.dy;
                let targetX = cursorX + dPos.dx;
                if (this.isInBound(targetY, targetX)) {
                    let target = [targetY, targetX];
                    this.actionQueue.push({
                        "action": "move",
                        "source": this.state.cursor,
                        "target": target
                    });
                    this.setState({cursor: target});
                }
            }
        };

        this.onClickBound = e => {
            let target = e.currentTarget;
            let y = parseInt(target.getAttribute("y"));
            let x = parseInt(target.getAttribute("x"));
            if (this.isPlayer[y][x]) {
                this.setState({cursor: [y, x]});
            }
        };
    }

    componentDidMount() {
        // Call our fetch function below once the component mounts
        // this.callBackendAPI()
        //     .then(res => this.setState({ squares: res.squares }))
        //     .catch(err => console.log(err));

        console.log('component did mount');
        document.addEventListener("keydown", this.keyDownBound);

        this.ws = new WebSocket('ws://localhost:5000');

        this.ws.addEventListener('message',  event => {
            var json = JSON.parse(event.data);
            if (json.event === 'connected') {
                this.setState({
                    player: json.player,
                    secret: json.secret
                });
            }
            else if (json.event === 'init') {
                console.log("initializing")
                this.setState({
                    cursor: json.base,
                    width: json.width,
                    height: json.height,
                })
                console.log(json)
            }
            else if (json.event === 'request_action') {
                this.onUpdateRequest()
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
            else {
                console.log("dafuck");
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
        console.log(this.state)
        let playerStatus = this.state.playerStatus;
        let player = this.state.player;
        if (this.state.squares) {
            if (playerStatus[player]['status'] === "lost" || playerStatus[player]['status'] === "won") {
                return (
                    <div id="game-page">
                        {/*<PlayerBoard playerStatus={playerStatus}/>*/}

                        <Map squares={this.state.squares} cursor={this.state.cursor} handleClick={this.onClickBound}/>

                        <EndGame status={playerStatus[player]['status']}/>
                    </div>

                );
            }
            return (
                <div id="game-page">
                    <Map squares={this.state.squares} cursor={this.state.cursor} handleClick={this.onClickBound}/>
                    {JSON.stringify(playerStatus)}
                    You are Player {player}
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
        // check for valid queue
        let isPlayer = newState.squares.map(row => {
            return row.map(cell => {
                return cell.unit && cell.unit.playerId === this.state.player;
            });
        });

        this.actionQueue = this.actionQueue.filter(action => {
            if (action.action === "move") {
                let [y, x] = action.source;
                if (isPlayer[y][x]) {
                    isPlayer[y][x] = false;
                    let [newY, newX] = action.target;
                    isPlayer[newY][newX] = true;
                    return true;
                }
            }
            return false; // bad queued move
        });
        this.isPlayer = isPlayer;

        let newCursor = this.state.cursor;
        if (newCursor) {
            let [y, x] = newCursor;
            if (newCursor) {
                let [y, x] = newCursor;
                if (!isPlayer[y][x]) {
                    newCursor = null;
                }
            }
        }

        this.setState({squares: newState.squares, playerStatus: newState.playerStatus, cursor: newCursor});
    }

    onUpdateRequest() {
        if (this.actionQueue.length < 1){
            this.ws.send(JSON.stringify({'secret': this.state.secret, 'action': {action:null, source:null, target:null}}));
        }
        else {
            let returnedAction = this.actionQueue[0];
            this.actionQueue.shift();
            this.ws.send(JSON.stringify({'secret': this.state.secret, 'action': returnedAction}));
        }
    }
}

export default Game;
