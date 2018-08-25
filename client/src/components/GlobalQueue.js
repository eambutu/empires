import sword from "../sword.svg";
import React from "react";
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";

export default function GlobalQueue(props) {
    const {waitingText, goToHomeMenu} = props;

    return (
        <div>
            <div className="center">
                <img src={sword} className="App-logo" alt="logo"/>
                <div className="title">squarecraft.io</div>
                <div className="App-text">
                    {waitingText}
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