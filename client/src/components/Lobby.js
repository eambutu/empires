import React from 'react';
import '../styles/Lobby.css';
import sword from "../sword.svg";

export default function Lobby(props) {
    const {statuses, togglePlayerReady, playerIds, playerStatus, waitingText, active} = props;
    let roomName = window.location.href.split("/").pop()
    console.log(active)

    console.log(statuses)
    let rows = Object.keys(statuses).map((name, index) => (
        <tr>
            <td style={{minWidth: "100px", textAlign: "left"}}>
                <div className={"lobby-display-name"}>
                    {name}
                </div>
            </td>
            <td style={{minWidth: "100px", textAlign: "right"}}>
                <button className={statuses[name] ? "ready-up-button-active" : "ready-up-button"} onClick={togglePlayerReady}>
                    <div>{statuses[name] ? "ready" : "ready up"}
                    </div>
                </button>
            </td>
        </tr>
    ));
    return (
        <div className={"center"}>
            <div className={"lobby-title"}>
                <img src={sword} className="App-logo" alt="logo"/>
                <div className="title">{roomName}</div>
            </div>
            <div style={{margin:"50px"}}> Game Type: <br/> <button id={"gameTypeButton"}> Duel </button> </div>
                {waitingText}
                <br/>
                <table className={"lobby-player-table"}>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
        </div>
    )

}