import React from "react";

import "../styles/Homepage.css";
import globe from "../globe.svg";

export default function HomepageButtons(props) {
    const {onLeaveGlobe, onHoverGlobe, showLeaderboard, onFocusUsername, onKeyPressNameForm, onRegisterUsername, onClickFFA, goToPlayMenu, menuIndex, username, rating, ranking} = props;
    console.log(menuIndex);
    switch(menuIndex) {
        case 0:
            return (
                <div id={"homepage-buttons"}>
                    <div>
                        <div className={"rating-text"}>
                        Rating: {rating} <br/>
                        </div>
                        <div style={{alignItems: "center", justifyContent: "center", display: "flex", fontSize: "20px"}}>
                        (Rank: {ranking}) <div id={"globe"} onClick={showLeaderboard} onMouseLeave={onLeaveGlobe} onMouseOver={onHoverGlobe} className={"globe"} style={{backgroundImage: `url(${globe})`}}></div>
                        </div>
                        <form onKeyPress={onKeyPressNameForm} onSubmit={() => onRegisterUsername(() => {document.getElementById("username").disabled = true;})} action="#">
                            <input disabled={username ? true : false} autoComplete="off" onFocus={onFocusUsername} type="text" id="username" placeholder="Username" value={username}/> <br/>
                        </form>
                        <div id={"usernameTakenText"} style={{visibility:"hidden", fontSize: "12px", color: "#ff4136"}}>
                            Careful! You can only set your username once.
                        </div>
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
                        Rating: {rating} <br/>
                    </div>
                    <div style={{fontSize: "20px"}}>
                        (Rank: {ranking})
                    </div>
                    <div>
                        <input disabled={username ? true : false} type="text" id="room_id" placeholder="Username" value={username}/> <br/>
                    </div>
                    <div id={"usernameTakenText"} style={{visibility: "hidden", fontSize: "12px", color: "#ff4136"}}>
                        Careful! You can only set your username once.
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