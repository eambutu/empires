import React from "react";
import '../styles/TutorialBox.css';

export default function TutorialBox(props) {
    const {nextBox, text} = props;
    return (
        <div className={"tutorial-box"}>
            <div className={"tutorial-text"}>
                {text}
            </div>
            <button className={"tutorial-button"} onClick={nextBox}>Continue</button>
        </div>
    );
}