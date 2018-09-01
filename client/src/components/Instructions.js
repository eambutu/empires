import React, {Component} from "react";
import redkeyboard from "../redkeyboard.svg";
import whitekeyboard from "../whitekeyboard.svg";

class Instructions extends Component{
    constructor(props) {
        super(props);
        this.onLeaveKeyboard = () => {
            document.getElementById("keyboard").style.backgroundImage = `url(${redkeyboard})`
        };

        this.onHoverKeyboard = () => {
            document.getElementById("keyboard").style.backgroundImage = `url(${whitekeyboard})`
        };

        this.hideInstructions = () =>{
            document.getElementById("instructions").style.display = "none"
        };

        this.showInstructions = () => {
            document.getElementById("instructions").style.display = "block"
        };


    }

    render() {
        return (
            <div>
            <div id={"instructions"} className="pop-up-board center" style={{display: "none"}}>
                <h1 style={{color: "black"}}>Detailed Instructions</h1>
                <div className={"pop-up-table-holder"}>
                    <table cellSpacing="0" className="pop-up-table">
                        <tbody>
                        <tr>
                            <td><b>Key</b></td>
                            <td><b>Description</b></td>
                        </tr>
                        <tr>
                            <td> w</td>
                            <td> Move up</td>
                        </tr>
                        <tr>
                            <td> a</td>
                            <td> Move left</td>
                        </tr>
                        <tr>
                            <td> s</td>
                            <td> Move down</td>
                        </tr>
                        <tr>
                            <td> d</td>
                            <td> Move right</td>
                        </tr>
                        <tr>
                            <td> Space</td>
                            <td> Spawn attacker</td>
                        </tr>
                        <tr>
                            <td> Ctrl/Cmd Click</td>
                            <td> Spawn defender at location</td>
                        </tr>
                        <tr>
                            <td> e</td>
                            <td>Cycle between attackers</td>
                        </tr>
                        <tr>
                            <td> q</td>
                            <td> Cancel current unit's queue</td>
                        </tr>
                        <tr>
                            <td> c</td>
                            <td> Cancel all queues</td>
                        </tr>
                        <tr>
                            <td> -</td>
                            <td> Zoom out</td>
                        </tr>
                        <tr>
                            <td> =</td>
                            <td> Zoom in</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                <button onClick={this.hideInstructions}>Close</button>
            </div>
            <div className="keyboard-holder" style={{position: "fixed", bottom: 0, left: 0}}>
                <div id={"keyboard"} onClick={this.showInstructions} onMouseLeave={this.onLeaveKeyboard} onMouseOver={this.onHoverKeyboard} className={"keyboard"} style={{backgroundImage: `url(${redkeyboard})`}}></div>
            </div>
            </div>
        )
    }
}

export default Instructions;