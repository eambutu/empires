import sword from "../sword.svg";
import React from "react";
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";
import person_red from "../person_red.svg";
import person from "../person.svg";
import {ReadyType, LobbyState} from "./config"


export default function GlobalQueue(props) {
    const {roomType, lobbyState, forceStartSec, waitingSec, statuses, goToHomeMenu, playerId, togglePlayerReady} = props;

    let numInQueue = Object.keys(statuses).length;

    let peopleIcons = [...Array(4)].map((_, index) => {
        let img = (index < numInQueue) ? person_red : person;
        return <div key={index} className="queue-people-icons" style={{backgroundImage: `url(${img}`}}></div>
    });

    let buttonClassName = "ready-up-button";
    if (playerId in statuses) {
        buttonClassName = (statuses[playerId]['ready'] === ReadyType.NOT_READY) ? "ready-up-button" : "ready-up-button-active";
    }

    let numWaitingClients = Object.keys(statuses).length;
    let numReadyClients = Object.keys(statuses).filter(id => {
        return (statuses[id]['ready'] === ReadyType.READY);
    }).length;

    let waitingText;
    switch (lobbyState) {
        case LobbyState.CONNECTED:
            waitingText = 'Connected! Currently in queue...';
            break;
        case LobbyState.STARTING:
            waitingText = `Starting game in ${waitingSec} seconds...`;
            break;
        case LobbyState.NO_SESSION:
            waitingText = 'A username is required. Redirecting to front page in 5 seconds...';
            break;
        default:
            waitingText = '';
    }

    return (
        <div>
            <div className="center">
                <img src={sword} className="App-logo-no-click" alt="logo"/>
                <div className="title">squarecraft.io</div>
                <div className="App-text">
                    {waitingText}
                </div>
                <div className={"queue-people-icons-container"}>
                    {peopleIcons}
                </div>
                <div className={"queue-poppers"} style={{visibility: (numInQueue > 1) ? "visible" : "hidden"}}>
                    <button className={buttonClassName} style={{width: "50%"}}onClick={togglePlayerReady}>
                        <div>Force-Start {numReadyClients}/{numWaitingClients}</div>
                    </button>
                    <div style={{visibility: (forceStartSec > 0 && lobbyState !== LobbyState.STARTING) ? "visible" : "hidden"}}>Auto-starting in {forceStartSec} seconds...</div>
                </div>
            </div>
            <div id="back-arrow" onMouseLeave={() => {document.getElementById("back-arrow").style.backgroundImage = `url(${arrow})`}}
                 onMouseOver={() => {document.getElementById("back-arrow").style.backgroundImage = `url(${redarrow})`}}
                 onClick={goToHomeMenu}
                 style={{backgroundImage: `url(${arrow})`}}
                 className={"back-arrow"}>
            </div>
        </div>
    );
}