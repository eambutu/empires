import React from 'react';
import '../styles/Lobby.css';
import sword from "../sword.svg";

export default function Lobby(props) {
    const {togglePlayerReady, playerIds, playerStatus, waitingText, active} = props;
    return (
        <div className={"center"}>
            <div className={"lobby-title"}>
                <img src={sword} className="App-logo" alt="logo"/>
                <div className="title">Lobby Name</div>
            </div>
            <div style={{margin:"50px"}}> Game Type: <br/> <button id={"gameTypeButton"}> Duel </button> </div>
                {waitingText}
                <br/>
                <table className={"lobby-player-table"}>
                    <tbody>
                    <tr>
                        <td style={{minWidth: "100px", textAlign: "left"}}>
                            <div className={"lobby-display-name"}>
                                Name 1
                            </div>
                        </td>
                        <td style={{minWidth: "100px", textAlign: "right"}}>
                            <button className={active ? "ready-up-button-active" : "ready-up-button"} onClick={togglePlayerReady}>
                                <div>ready up!
                                </div>
                            </button>
                        </td>

                    </tr>
                    </tbody>
                </table>
        </div>
    )

}