import React from 'react';
import '../styles/Lobby.css';
import sword from "../sword.svg";
import {ReadyType, GameType} from "./config"

export default function Lobby(props) {
    const {gameType, changeGameType, onMouseAwayDuel, onMouseOverDuel, onMouseAwayCTF, onMouseOverCTF, playerId, statuses, togglePlayerReady, playerIds, playerStatus, waitingText, active} = props;
    let roomName = decodeURI(window.location.href.split("/").pop());
    let duelButtonClass = "";
    let ctfButtonClass  = "";
    console.log(gameType)

    let playerRow = Object.keys(statuses).filter(id => {
        console.log(id);
        console.log(playerId);
        console.log(id === playerId);
        return (id === playerId)
    });

    let playerRows = Object.keys(statuses).filter(id => {return id === playerId}).map((id, index) => {
        return (
            <tr>
                <td style={{minWidth: "100px", textAlign: "left"}}>
                    <div className={"lobby-display-name"}>
                        {statuses[playerId]['name']}
                    </div>
                </td>
                <td style={{minWidth: "100px", textAlign: "right"}}>
                    <button className={statuses[playerId]['ready'] === ReadyType.NOT_READY ? "ready-up-button" : "ready-up-button-active"} onClick={togglePlayerReady}>
                        <div>{statuses[playerId]['ready'] === ReadyType.NOT_READY ? "Ready up" : "Ready"}
                        </div>
                    </button>
                </td>
            </tr>
        )
    });

    let otherRows = Object.keys(statuses).filter(id => {return id !== playerId}).map((id, index) => {
        // console.log(id)
        let otherPlayerStatusStr;
        if (statuses[id]['ready'] === ReadyType.NOT_READY) {
            otherPlayerStatusStr = "Not yet ready"
        } else if (statuses[id]['ready'] === ReadyType.READY) {
            otherPlayerStatusStr = "Ready";
        } else if (statuses[id]['ready'] === ReadyType.PLAYING) {
            otherPlayerStatusStr = "Playing";
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
                <img onClick={() => {window.location.replace("http://squarecraft.io")}} src={sword} className="App-logo" alt="logo"/>
                <div style={{cursor:"pointer"}} className="title">{roomName}</div>
            </div>
            <div style={{marginBottom:"15px"}}> Game Type: <br/>

                <div className={"custom-game-buttons"}>
                    <button className={"active"} onClick={() => {changeGameType(GameType.DUEL)}} onMouseLeave={onMouseAwayDuel} onMouseEnter={onMouseOverDuel} id={"duelButton"}> Duel </button>
                    <button onClick={() => {changeGameType(GameType.CTF)}} onMouseLeave={onMouseAwayCTF} onMouseEnter={onMouseOverCTF} id={"ctfButton"}> Capture The Flag </button>
                </div>
                <div id={"gamedescription"} style={{fontSize: "15px", visibility:"hidden"}}>
                    Duel: Take over your opponent's base to win.
                </div>

            </div>
                {waitingText}
                <br/>
                <table className={"lobby-player-table"}>
                    <tbody>
                        {playerRows.concat(otherRows)}
                    </tbody>
                </table>
        </div>
    )

}