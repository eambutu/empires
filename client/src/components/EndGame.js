import React from "react";
import '../styles/EndGame.css';

export default function EndGame(props) {
    const {status, resetClick, exitClick} = props;
    if (status === "won") {
        return (
            <div className={"center endgame"}>
                <h1>Victory!</h1>
                <button className={"end-button"} onClick={resetClick}>Play Again</button>
                <br></br>
                <button className={"end-button"} onClick={exitClick}>Exit</button>
            </div>
        );
    }

    if (status === "lost") {
        return (
            <div className={"center end-button endgame"}>
                <h1>Defeat!</h1>
                <button onClick={resetClick}>Play Again</button>
                <br></br>
                <button onClick={exitClick}>Exit</button>
            </div>
        );
    }
}