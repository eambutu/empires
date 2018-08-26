import React, {Component} from 'react';
import '../styles/RoomList.css';
import sword from "../sword.svg";

const _ = require('lodash');

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {data: null};

        this.onClickSubmitLobby = () => {
            window.location = "/room/" + document.getElementById("room_id").value
        }

    }

    onClickRoom(id) {
        function onClick(e) {
            window.location.href = '/room/' + id;
        }

        return onClick;
    }

    componentDidMount() {
        this.callBackendAPI()
            .then(res => {
                let filtered = _.pickBy(res, function(value) {
                    return (!value['isTutorial']);
                })
                this.setState({data: filtered})
            })
            .catch(err => console.log(err));
    }

    // Fetch the list of rooms from express
    callBackendAPI = async () => {
        const response = await fetch('/room_list');
        const body = await response.json();

        if (response.status !== 200) {
            throw Error(body.message)
        }
        return body;
    };

    render() {
        if (this.state.data) {
            // make sure that full lobbies aren't shown
            const filtered_data = Object.entries(this.state.data).filter(value => value[1]['numPlayersIn'] !== value[1]['numPlayers'])
            return (
                <div className={"room-list-title"}>
                    <img src={sword} className="App-logo" alt="logo"/>
                    <div className="title">Lobbies</div>
                        <div className={"create-lobby"}>
                            <div className={"join-room-text"}>
                                Create or join a room: <br/><input type="text" id="room_id"/> <br/>
                            </div>
                            <button className="homepage-button" onClick={this.onClickSubmitLobby}>Play</button>
                        </div>
                        <div className={"room-list-table-holder"}>
                            <table>
                                <tbody className={"room-list-table"}>
                                    {filtered_data.map(([key, value]) => (
                                        <tr onClick={this.onClickRoom(value["id"])} className={"room-list-row-container"}>
                                            <div className={"room-list-row"}>
                                            <td className={"room-list-element"}>
                                                {value['id']}
                                            </td>
                                            <td className={"room-list-element"}>
                                                {value['numPlayersIn']} / {value['numPlayers']}
                                            </td>
                                            </div>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                </div>
        )
        } else {
            return <div></div>
        }
    }
}

export default RoomList;