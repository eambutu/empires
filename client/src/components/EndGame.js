import React from "react";
import '../styles/EndGame.css';

export default function EndGame(props) {
    const {status, resetClick, exitClick, canPlayAgain, onReplay} = props;
    return (
        <div className={"center endgame"}>
        <h1>{status === "won" ? "Victory!" : "Defeat!"}</h1>
            {canPlayAgain && <button className={"end-button"} onClick={resetClick}>Play Again</button>}
            {canPlayAgain && <br></br>}
            {onReplay && <button className={"end-button"} onClick={onReplay}>Replay</button>}
            {onReplay && <br></br>}
            <button className={"end-button"} onClick={exitClick}>Exit</button>
        </div>
    );
}