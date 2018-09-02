import React from 'react';
import '../styles/Lobby.css';
import sword from "../sword.png";
import {ReadyType, GameType, RoomType, LobbyState} from "./config"
import Game from "./Game";

export default function Lobby(props) {
    const {roomType, gameType, changeGameType, onMouseAwayDuel, onMouseOverDuel, onMouseAwayCTF, onMouseOverCTF, playerId, statuses, togglePlayerReady, playerIds, playerStatus, lobbyState} = props;
    let roomName = decodeURI(window.location.href.split("/").pop());

    let playerRows = Object.keys(statuses).filter(id => {return id === playerId}).map((id, index) => {
        return (
            <tr key={playerId}>
                <td style={{minWidth: "100px", textAlign: "left"}}>
                    <div className={"lobby-display-name"}>
                        {statuses[playerId]['name']}
                    </div>
                </td>
                <td style={{minWidth: "100px", textAlign: "right"}}>
                    <button className={(statuses[playerId]['ready'] === ReadyType.NOT_READY) ? "ready-up-button" : "ready-up-button-active"} onClick={togglePlayerReady}>
                        <div>{statuses[playerId]['ready'] === ReadyType.NOT_READY ? "Ready up" : "Ready"}
                        </div>
                    </button>
                </td>
            </tr>
        )
    });

    let otherRows = Object.keys(statuses).filter(id => {return id !== playerId}).map((id, index) => {
        let otherPlayerStatusStr;
        if (statuses[id]['ready'] === ReadyType.NOT_READY) {
            otherPlayerStatusStr = "Not yet ready"
        } else if (statuses[id]['ready'] === ReadyType.READY) {
            otherPlayerStatusStr = "Ready";
        } else if (statuses[id]['ready'] === ReadyType.PLAYING) {
            otherPlayerStatusStr = "Playing";
        }
        return (
            <tr key={id}>
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
            <button className={gameType === GameType.DUEL ? "active" : undefined} onClick={() => {changeGameType(GameType.DUEL)}} onMouseLeave={onMouseAwayDuel} onMouseEnter={onMouseOverDuel}> Duel </button>
            <button className={gameType === GameType.CTF ? "active" : undefined} onClick={() => {changeGameType(GameType.CTF)}} onMouseLeave={onMouseAwayCTF} onMouseEnter={onMouseOverCTF}> Capture The Flag </button>
        </div>
    );

    let waitingText;
    switch (lobbyState) {
        case LobbyState.CONNECTED:
            switch (roomType) {
                case RoomType.CUSTOM:
                    waitingText = 'Connected! Waiting for players to ready up.';
                    break;
                case RoomType.TUTORIAL:
                    waitingText = 'Connected! Welcome to the tutorial';
                    break;
                default:
                    waitingText = '';
            }
            break;
        case LobbyState.STARTING:
            switch (roomType) {
                case RoomType.TUTORIAL:
                    waitingText = 'Starting tutorial...';
                    break
                default:
                    waitingText = 'Starting game...';
            }
            break;
        case LobbyState.FULL:
            waitingText = 'This room is full. Redirecting to lobbies page in 5 seconds...';
            break;
        case LobbyState.NO_SESSION:
            waitingText = 'A username is required. Redirecting to front page in 5 seconds...';
            break;
        default:
            waitingText = '';
    }

    return (
        <div className={"custom-lobby-title"}>
            <div className={"lobby-title"}>
                <img onClick={() => {window.location.replace('/')}} src={sword} className="App-logo" alt="logo"/>
                <div style={{cursor:"pointer"}} className="title">{roomName}</div>
            </div>
            {[LobbyState.FULL, LobbyState.NO_SESSION].includes(lobbyState) ? undefined :
                <div style={{marginBottom:"15px"}}> Game Type: <br/>
                    <div className={"custom-game-buttons"}>
                        {gametypeButtons}
                    </div>
                    <div id={"gamedescription"} style={{fontSize: "15px", visibility:"hidden"}}>
                        Duel: Take over your opponent's base to win.
                    </div>
                </div>
            }
            {waitingText}
            <br/>
            <table className={"lobby-player-table"}>
                <tbody>
                    {playerRows.concat(otherRows)}
                </tbody>
            </table>
        </div>
    );
}