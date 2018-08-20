import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/App.css';
import Homepage from './Homepage.js';
import Game from './Game.js';

class App extends Component {

    state = {
        curState: "game",
    };

    startGame() {
        console.log("changed state")
        this.setState({curState: "game"});
        console.log(this.state)
    }

    render() {
        var comp = "wtf happened";
        console.log("rerender")
        console.log(this.state.curState)
        switch (this.state.curState) {
            case "home":
                comp = (
                    <Homepage startGame={() => this.startGame()}/>
                )
                break;
            case "game":
                comp = (
                    <Game />
                );
        }

        return (
            <div>
                {comp}
            </div>
        )
    }
}

export default App;