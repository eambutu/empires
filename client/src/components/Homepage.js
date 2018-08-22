import React, {Component} from 'react';
import attacker from '../attacker.svg';
import '../styles/Homepage.css';

class Homepage extends Component {
    componentDidMount() {
        // Call our fetch function below once the component mounts
        this.callBackendAPI()
            .then(res => this.setState({data: res.express}))
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
        return (
            <div className="App">
                <header className="App-header">
                    <img src={attacker} className="App-logo" alt="logo"/>
                    <h1 className="App-title">empires.io</h1>
                </header>
                <div className="App-text">
                    Room ID: <input type="text" id="room_id"/> <br/>
                    <button className="play-button" onClick={() => {window.location = "/room/" + document.getElementById("room_id").value}}>Play!</button>
                </div>
            </div>
        );
    }
}

export default Homepage;