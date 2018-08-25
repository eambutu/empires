import React from "react";
import arrow from "../arrow.svg";

export default function HomepageButtons(props) {
    const {onClickFFA, goToPlayMenu, menuIndex} = props;
    console.log(menuIndex);
    switch(menuIndex) {
        case 0:
            return (
                <div id={"homepage-buttons"}>
                    <div>
                        <input type="text" id="room_id" placeholder="Username"/> <br/>
                    </div>
                    <button className="homepage-button" onClick={goToPlayMenu}>Play!</button>
                    <br/>
                    <button className="homepage-button" onClick={() => {window.location = "/tutorial/"}}>Tutorial</button>
                </div>
            )

        case 1:
            return (
                <div id={"play-buttons"}>
                    <div>
                        <input type="text" id="room_id" style={{visibility: "hidden"}}placeholder="Username"/> <br/>
                    </div>
                    <button id="ffa-game-button" className="homepage-button" onClick={onClickFFA}>FFA</button>
                    <br/>
                    <button id="custom-game-button" className="homepage-button" onClick={() => {window.location = "/room/"}}>Custom Game</button>
                </div>
            )
    }

}