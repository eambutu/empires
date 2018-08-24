import React, {Component} from 'react';
import '../styles/RoomList.css';

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
            return <table>
                <tbody>
                {Object.entries(this.state.data).map(([key, value]) => (
                    <tr>
                        <td>
                            Room Name: {value['id']}
                        </td>
                        <td>
                            {value['numPlayers']} / {value['maxPlayers']}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        } else {
            return <div></div>
        }
    }
}

export default RoomList;