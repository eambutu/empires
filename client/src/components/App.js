import React, {Component} from 'react';
import logo from '../logo.svg';
import '../styles/App.css';
import Homepage from './Homepage.js';
import Game from './Game.js';

class App extends Component {

    state = {
        curState: "game",
    };

    startGame() {
        this.setState({curState: "game"});
    }

    render() {
        var comp = "wtf happened";
        switch (this.state.curState) {
            case "home":
                comp = (
                    <Homepage startGame={() => this.startGame()}/>
                )
                break;
            case "game":
                comp = (
                    <Game/>
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