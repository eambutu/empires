import React from "react";
import '../styles/EndGame.css';

export default function EndGame(props) {
    const {status, resetClick, exitClick, canPlayAgain} = props;
    return (
        <div className={"center endgame"}>
        <h1>{status === "won" ? "Victory!" : "Defeat!"}</h1>
            {canPlayAgain &&
                <button className={"end-button"} onClick={resetClick}>Play Again</button> && <br></br>
            }
            <button className={"end-button"} onClick={exitClick}>Exit</button>
        </div>
    );
}