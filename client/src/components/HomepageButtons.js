import React from "react";

import "../styles/Homepage.css";

export default function HomepageButtons(props) {
    const {onRegisterUsername, onClickFFA, goToPlayMenu, menuIndex} = props;
    console.log(menuIndex);
    switch(menuIndex) {
        case 0:
            return (
                <div id={"homepage-buttons"}>
                    <div>
                        <div className={"rating-text"}>
                        Rating: 1000 <br/>
                        </div>
                        <div style={{fontSize: "10px"}}>
                        (Rank 200)
                        </div>
                        <form onSubmit={onRegisterUsername(() => {})} action="#">
                            <input type="text" id="username" placeholder="Username"/> <br/>
                        </form>
                    </div>
                    <button className="homepage-button" onClick={() => {onRegisterUsername(goToPlayMenu);}}>Play!</button>
                    <br/>
                    <button className="homepage-button" onClick={() => {window.location = "/tutorial/";}}>Tutorial</button>
                </div>
            )

        case 1:
            return (
                <div id={"play-buttons"}>
                    <div className={"rating-text"}>
                        Rating: 1000 <br/>
                    </div>
                    <div style={{fontSize: "10px"}}>
                        (Rank 200)
                    </div>
                    <div>
                        <input type="text" id="room_id" placeholder="Username"/> <br/>
                    </div>
                    <button id="ffa-game-button" className="homepage-button" onClick={onClickFFA}>FFA</button>
                    <br/>
                    <button id="custom-game-button" className="homepage-button" onClick={() => {window.location = "/room/"}}>Custom Game</button>
                </div>
            )
        default:
            return null;
    }

}