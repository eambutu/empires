import React from "react";
import '../styles/TutorialBox.css';

export default function TutorialBox(props) {
    const {index, prevBox, nextBox, text} = props;
    return (
        <div className={"tutorial-box"}>
            <div className={"tutorial-text"}>
                {text}
            </div>
            <button className={"tutorial-button"} onClick={nextBox}>Continue</button>

            <button style={index > 0 ? {display: "inline-block"} : {display : "none"}} className={"tutorial-button"} onClick={prevBox}>Go Back</button>
        </div>
    );
}