import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Game.css';
import Map from "./Map";
import update from 'immutability-helper';

const keyMap = {
    ArrowDown: { dx: 0, dy: 1 },
    ArrowUp: { dx: 0, dy: -1 },
    ArrowLeft: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 }
};

let actionQueue = [];

let player = 0;
let id = 0;

class Game extends Component {

    constructor(props) {
        super(props);
        this.state = {
            squares: null,
            width: -1,
            height: -1,
            cursor: [0,0],
        }

        this.keyDownBound = e => {
            console.log(e.key);
            const dPos = keyMap[e.key];
            if (dPos) {
                // console.log(Math.min(3, Math.max(0, this.state.cursor[1] + dPos.dx)))
                let newCursor = [
                    Math.min(this.state.height - 1, Math.max(0, this.state.cursor[0] + dPos.dy)),
                    Math.min(this.state.width - 1, Math.max(0, this.state.cursor[1] + dPos.dx))
                ]
                console.log(this.state.cursor[0])
                console.log(this.state.cursor[0] + dPos.dy)
                console.log(Math.min(3, Math.max(0, this.state.cursor[0] + dPos.dy)))
                actionQueue.push({
                    "action" : "move",
                    "source": this.state.cursor,
                    "target": newCursor
                })
                console.log(actionQueue)
                this.setState({cursor: newCursor})
            }
        };

        this.onClickBound = e => {
            console.log(e.currentTarget);
            if (e.currentTarget.getAttribute("isattacker") === "true") {
                this.setState({cursor: [parseInt(e.currentTarget.getAttribute("y")), parseInt(e.currentTarget.getAttribute("x"))]});
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
                player = json.player;
                id = json.id;
            }
            else if (json.event === 'init') {
                this.setState({
                    cursor: json.base,
                    width: json.width,
                    height: json.height,
                })
            }
            else if (json.event === 'request_action') {
                this.onUpdateRequest()
            }
            else if (json.event === 'update') {
                this.updateGame(json.state);
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
        if (this.state.squares) {
            return (
                <div id="game-page">
                    <Map squares={this.state.squares} cursor={this.state.cursor} handleClick={this.onClickBound}/>
                </div>
            );
        }
        else {
            return (
                <div>Pending game start</div>
            )
        }
    }

    // take a list of new squares for us to update
    updateGame(newSquares) {
        let newData = {};
        // newSquares.forEach( s => {
        //     let [x, y] = s.pos;
        //     newData = update(this.state, {
        //         squares: {[x] : {[y] : {$set: s}}}
        //     });
        // });

        this.setState({squares: newSquares});
    }

    onUpdateRequest() {
        if (actionQueue.length < 1){
            this.ws.send(JSON.stringify({'id': id, 'action': {action:null, source:null, target:null}}));
        }
        else {
            let returnedAction = actionQueue[0];
            actionQueue.shift();
            this.ws.send(JSON.stringify({'id': id, 'action': returnedAction}));
        }
    }
}

export default Game;