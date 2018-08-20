import React from "react";
import '../styles/EndGame.css';

export default function EndGame(props) {
    const {status} = props;
    if (status === "won") {
        return (
            <div className={"center endgame"}>
                <h1>Victory!</h1>
                <button>Play Again</button>
                <br></br>
                <button>Exit</button>
            </div>
        );
    }

    if (status === "lost") {
        return (
            <div className={"center endgame"}>
                <h1>Defeat!</h1>
                <button>Play Again</button>
                <br></br>
                <button>Exit</button>
            </div>
        );
    }
}