import React, {Component} from 'react';
import sword from '../sword.svg';
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
            <div>
                <div className="center">
                    <img src={sword} className="App-logo" alt="logo"/>
                    <div className="title">squarecraft.io</div>
                    <div className="App-text">
                        Create or join a room: <br/><input type="text" id="room_id"/> <br/>
                        <div className="button-area">
                            <button className="homepage-button" onClick={() => {window.location = "/room/" + document.getElementById("room_id").value}}>Play!</button>
                            <br/>
                            <button className="homepage-button" onClick={() => {window.location = "/tutorial/"}}>Tutorial</button>
                        </div>
                    </div>
                </div>
                <div className="footer">
                    {<a href={"contact@squarecraft.io"}>Contact Us!</a>}
                </div>
            </div>
        );
    }
}

export default Homepage;