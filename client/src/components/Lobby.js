import React from 'react';
import '../styles/Lobby.css';
import sword from "../sword.svg";
import {ReadyType, GameType} from "./config"
import Game from "./Game";

export default function Lobby(props) {
    const {gameType, changeGameType, onMouseAwayDuel, onMouseOverDuel, onMouseAwayCTF, onMouseOverCTF, playerId, statuses, togglePlayerReady, playerIds, playerStatus, waitingText} = props;
    let roomName = decodeURI(window.location.href.split("/").pop());

    let anyPlaying = false;
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
            anyPlaying = true;
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

    let gametypeButtons = (
        <div>
            <button className={gameType === GameType.DUEL && "active"} onClick={() => {changeGameType(GameType.DUEL)}} onMouseLeave={onMouseAwayDuel} onMouseEnter={onMouseOverDuel}> Duel </button>
            <button className={gameType === GameType.CTF && "active"} onClick={() => {changeGameType(GameType.CTF)}} onMouseLeave={onMouseAwayCTF} onMouseEnter={onMouseOverCTF}> Capture The Flag </button>
        </div>
    );

    if (anyPlaying) {
        gametypeButtons = (
            <div className={"disabled-buttons"}>
                <button className={gameType === GameType.DUEL && "active"} disabled={true}> Duel </button>
                <button className={gameType === GameType.CTF && "active"} disabled={true}> Capture The Flag </button>
            </div>
        )
    }



    return (
        <div className={"custom-lobby-title"}>
            <div className={"lobby-title"}>
                <img onClick={() => {window.location.replace("http://squarecraft.io")}} src={sword} className="App-logo" alt="logo"/>
                <div style={{cursor:"pointer"}} className="title">{roomName}</div>
            </div>
            <div style={{marginBottom:"15px"}}> Game Type: <br/>

                <div className={"custom-game-buttons"}>
                    {gametypeButtons}
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