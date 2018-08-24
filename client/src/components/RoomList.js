import React, {Component} from 'react';
import '../styles/RoomList.css';
import sword from "../sword.svg";

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {data: null};
    }

    componentDidMount() {
        this.callBackendAPI()
            .then(res => {
                console.log(res);
                this.setState({data: res})
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
            return (
                <div className={"room-list-title"}>
            <img src={sword} className="App-logo" alt="logo"/>
            <div className="title">Lobbies</div>
            <table>
                <tbody className={"room-list-table"}>
                {Object.entries(this.state.data).map(([key, value]) => (
                    <tr className={"room-list-row-container"}>
                        <div className={"room-list-row"}>
                        <td className={"room-list-element"}>
                            {value['id']}
                        </td>
                        <td className={"room-list-element"}>
                            {value['numPlayers']} / {value['maxPlayers']}
                        </td>
                        </div>
                    </tr>
                ))}
                </tbody>
            </table>
                </div>
        )
        } else {
            return <div></div>
        }
    }
}

export default RoomList;