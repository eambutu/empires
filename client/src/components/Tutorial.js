import PlayerBoard from "./PlayerBoard";
import Map from "./Map";
import EndGame from "./EndGame";
import React, {Component} from "react";
import TutorialBox from "./TutorialBox";

class Tutorial extends Component {

    constructor(props) {
        super(props);
        this.props = props;
        this.nextBox = () => {
            console.log("hi")
        }
    }

    render() {
        return (
            <div>
                <TutorialBox nextBox={this.nextBox}/>
                <Map squares={this.props.squares} actionQueue={[]} cursor={this.props.cursor} handleClick={this.props.handleClick}/>
            </div>
        );
    }
}

export default Tutorial;