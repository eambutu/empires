import PlayerBoard from "./PlayerBoard";
import Map from "./Map";
import EndGame from "./EndGame";
import React, {Component} from "react";
import TutorialBox from "./TutorialBox";

const tutorialTextMap = {
    0: "Hi! Welcome to Squarecraft.io. Let’s walk you through how to play.",
    1: "The objective of Squarecraft is to take the opponent’s base and defend your own",
    2: "You have two army types. Defenders are static, and can defend against up to 10 attacker hits. Attackers move around and can take other squares. Click the attacker and use wasd to move your attacker around.",
    3: "Defenders cost 200 shards. Hold alt and click a valid location to spawn a defender. Try it!",
    4: "Increase your shard collection rate by taking over these shard towers.",
    5: "You can also take the vision tower for more vision.",
    6: "Have fun!",
}


class Tutorial extends Component {

    constructor(props) {
        super(props);
        this.state = {
            textIndex: 0
        }
        this.props = props;
        this.nextBox = () => {
            console.log("hi")
            this.state.textIndex += 1;
        }
    }

    render() {
        return (
            <div>
                <TutorialBox nextBox={this.nextBox} text={tutorialTextMap[this.state.textIndex]}/>
                <Map playerId={this.props.playerId} playerIds={this.props.playerIds} squares={this.props.squares} queue={[]} cursor={this.props.cursor} handleClick={this.props.handleClick}/>
            </div>
        );
    }
}

export default Tutorial;