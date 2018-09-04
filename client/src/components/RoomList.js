import React, {Component} from 'react';
import '../styles/RoomList.css';
import sword from "../sword.svg";

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: null,
            lastFailedName: null
        };

        this.onClickSubmitLobby = () => {
            let roomName = document.getElementById('room_id').value;
            if (['..', '.', ''].includes(roomName) || roomName.includes('/')) {
                console.log('last failed', roomName);
                this.setState({lastFailedName: roomName});
            } else {
                window.location = "/room/" + roomName;
            }
        }

    }

    setUpWebSocket(wsPath) {
        this.ws = new WebSocket(wsPath);
        this.ws.addEventListener('message', event => {
            let data = JSON.parse(event.data);
            if (data.event === 'room_list') {
                this.setState({data: data.roomList});
            }
        });
    }

    componentDidMount() {
        let wsPath = 'ws://' + window.location.hostname + ':5000/room_list';
        this.setUpWebSocket(wsPath);
        document.body.style.overflow = "scroll";
    }
    
    render() {
        if (this.state.data) {
            return (
                <div className={"room-list-title"}>
                    <img onClick={() => {window.location.replace('/')}} src={sword} className="App-logo" alt="logo"/>
                    <div className="title">Lobbies</div>
                        <div className={"create-lobby"}>
                            <div className={"join-room-text"}>
                                Create or join a room: <br/><input type="text" id="room_id"/> <br/>
                            </div>
                            <div id={"badRoomText"} style={{visibility: this.state.lastFailedName !== null ? "visible" : "hidden", fontSize: "12px", color: "#ff4136"}}>
                                Cannot create room with name "{this.state.lastFailedName}"
                            </div>
                            <button className="homepage-button" onClick={this.onClickSubmitLobby}>Play</button>
                        </div>
                        <div className={"room-list-table-holder"}>
                            <table>
                                <tbody className={"room-list-table"}>
                                    {Object.values(this.state.data).map(room => (
                                        <tr key={room['id']} onClick={() => window.location.replace(`/room/${room['id']}`)} className={"room-list-row-container"}>
                                            <div className={"room-list-row"}>
                                            <td className={"room-list-element"}>
                                                {room['id']}
                                            </td>
                                            <td className={"room-list-element"}>
                                                {room['numPlayersIn']} / {room['maxNumPlayers']}
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