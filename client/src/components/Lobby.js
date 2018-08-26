import React from 'react';
import '../styles/Lobby.css';
import sword from "../sword.svg";
import {ReadyType} from "./config"

export default function Lobby(props) {
    const {onMouseAwayChangeGameType, onMouseOverChangeGameType, playerId, statuses, togglePlayerReady, playerIds, playerStatus, waitingText, active} = props;
    let roomName = window.location.href.split("/").pop()
    console.log(active)
    console.log(playerId)
    console.log(statuses)
    let rows = Object.keys(statuses).map((id, index) => {
        console.log(id)

        let otherPlayerStatusStr;
        if (statuses[id]['ready'] === ReadyType.NOT_READY) {
            otherPlayerStatusStr = "Not yet ready"
        } else if (statuses[id]['ready'] === ReadyType.READY) {
            otherPlayerStatusStr = "Ready";
        } else if (statuses[id]['ready'] === ReadyType.PLAYING) {
            otherPlayerStatusStr = "Playing";
        }


        if (id === playerId) {
            console.log("HIIII")
            return (
                <tr>
                    <td style={{minWidth: "100px", textAlign: "left"}}>
                        <div className={"lobby-display-name"}>
                            {statuses[id]['name']}
                        </div>
                    </td>
                    <td style={{minWidth: "100px", textAlign: "right"}}>
                        <button className={statuses[id]['ready'] === ReadyType.NOT_READY ? "ready-up-button" : "ready-up-button-active"} onClick={togglePlayerReady}>
                            <div>{statuses[id]['ready'] === ReadyType.NOT_READY ? "Ready up" : "Ready"}
                            </div>
                        </button>
                    </td>
                </tr>
            )
        }
        return (
            <tr>
                <td style={{minWidth: "100px", textAlign: "left"}}>
                    <div className={"lobby-display-name"}>
                        {statuses[id]['name']}
                    </div>
                </td>
                <td style={{minWidth: "100px", textAlign: "right"}}>
                    <button className={'other-player-ready-status-button'}>
                        <div>{otherPlayerStatusStr}
                        </div>
                    </button>
                </td>
            </tr>
        )
    });
    return (
        <div className={"custom-lobby-title"}>
            <div className={"lobby-title"}>
                <img src={sword} className="App-logo" alt="logo"/>
                <div className="title">{roomName}</div>
            </div>
            <div style={{margin:"50px"}}> Game Type: <br/> <button onMouseLeave={onMouseAwayChangeGameType} onMouseEnter={onMouseOverChangeGameType} id={"gameTypeButton"}> Duel </button> </div>
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