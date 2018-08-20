import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/App.css';
import Homepage from './Homepage.js';
import Game from './Game.js';

class App extends Component {

    state = {
        curState: "home",
    };

    startGame() {
        console.log("changed state")
        this.setState({curState: "game"});
        console.log(this.state)
    }

    componentDidMount() {
        // Call our fetch function below once the component mounts
        this.callBackendAPI()
            .then(res => this.setState({ data: res.express }))
            .catch(err => console.log(err));
    }
    // Fetches our GET route from the Express server. (Note the route we are fetching matches the GET route from server.js
    callBackendAPI = async () => {
        const response = await fetch('/express_backend');
        const body = await response.json();

        if (response.status !== 200) {
            throw Error(body.message)
        }
        return body;
    };

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