import React from "react";
import '../styles/TutorialBox.css';

export default function TutorialBox(props) {
    const {nextBox} = props;
    return (
        <div className={"tutorial-box"}>
            <h1>{"Victory!"}</h1>
            <button className={"tutorial-button"} onClick={nextBox}>Play Again</button>
        </div>
    );
}