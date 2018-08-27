import sword from "../sword.svg";
import React from "react";
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";
import person_red from "../person_red.svg";
import person from "../person.svg";

export default function GlobalQueue(props) {
    const {statuses, waitingText, goToHomeMenu} = props;
    console.log(statuses)
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