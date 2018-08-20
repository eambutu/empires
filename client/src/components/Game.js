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


class Game extends Component {

    constructor(props) {
        super(props);
        this.state = {
            squares: null,
            width: 4,
            height: 4,
            cursor: (0,0),
        }

        this.keyDownBound = e => {
            console.log(e.key);
            const dPos = keyMap[e.key];
            if (dPos) {
                let newCursor = (this.state.cursor[0] + dPos.dx, this.state.cursor[1] + dPos.dy)
                actionQueue.push({
                    "action" : "move",
                    "source": this.state.cursor,
                    "target": (this.state.cursor[0] + dPos.dx, this.state.cursor[1] + dPos.dy)
                })
                this.setState({cursor: newCursor})
            }
        };
    }

    componentDidMount() {
        // Call our fetch function below once the component mounts
        // this.callBackendAPI()
        //     .then(res => this.setState({ squares: res.squares }))
        //     .catch(err => console.log(err));

        document.addEventListener("keydown", this.keyDownBound);

        // temp
        this.setState({
            squares:
                [
                    [
                        {type: "empty", unit: { Unit: { playerId : 0 }}},
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty"},
                    ],
                    [
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty"},
                    ],
                    [
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty"},
                    ],
                    [
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty"},
                        {type: "empty", unit: { Unit: { playerId : 1 }}},
                    ],
                ],
            width: this.state.width,
            height: this.state.height,
            cursor: this.state.cursor,
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
                    <Map squares={this.state.squares}/>
                </div>
            );
        }
        else {
            return (
                <div>error, didn't get game state</div>
            )
        }
    }

    // take a list of new squares for us to update
    updateGame(newSquares) {
        let newData;
        for(let s in newSquares) {
            let [x, y] = s.loc;
            newData = update(this.state, {
                squares: {[x] : {[y] : {$set: s}}}
            });
        }

        this.setState(newData);
    }

    onUpdateRequest() {
        if (actionQueue.length < 1){
            return {};
        }
        else {
            let returnedAction = actionQueue[0];
            actionQueue.shift();
            return returnedAction;
        }
    }
}

export default Game;