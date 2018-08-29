import sword from "../sword.svg";
import React from "react";
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";
import person_red from "../person_red.svg";
import person from "../person.svg";
import {ReadyType} from "./config"


export default function GlobalQueue(props) {
    const {forceStartSec, statuses, waitingText, goToHomeMenu, playerId, togglePlayerReady} = props;
    console.log("statuses", statuses)
    let numInQueue = Object.keys(statuses).length;
    let peopleIcons = [];
    let img = null;

    let i = 0;
    console.log(numInQueue)
    while(i < 4){
        if (i < numInQueue) {
            img = `url(${person_red}`
        }
        else {
            img = `url(${person}`
        }
        peopleIcons.push(
            <div key={i} className="queue-people-icons" style={{backgroundImage: img}}>
            </div>
        );
        i++;
    }

    let buttonClassName = "ready-up-button";
    if (playerId in statuses) {
        buttonClassName = (statuses[playerId]['ready'] === ReadyType.NOT_READY ? "ready-up-button" : "ready-up-button-active");
    }

    let numWaitingClients = Object.keys(statuses).length;
    let numReadyClients = Object.keys(statuses).filter(id => {
        return (statuses[id]['ready'] === ReadyType.READY);
    }).length;

    return (
        <div>
            <div className="center">
                <img src={sword} className="App-logo" alt="logo"/>
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
                    <div style={{visibility: (forceStartSec > 0) ? "visible" : "hidden"}}>Auto-starting in {forceStartSec} seconds...</div>
                </div>
            </div>
            <div id="back-arrow" onMouseLeave={() => {console.log("hi"); document.getElementById("back-arrow").style.backgroundImage = `url(${arrow})`}}
                 onMouseOver={() => {console.log('hover'); document.getElementById("back-arrow").style.backgroundImage = `url(${redarrow})`}}
                 onClick={goToHomeMenu}
                 style={{backgroundImage: `url(${arrow})`}}
                 className={"back-arrow"}>
            </div>
        </div>
    );
}