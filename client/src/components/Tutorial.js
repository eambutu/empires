import PlayerBoard from "./PlayerBoard";
import Map from "./Map";
import EndGame from "./EndGame";
import React, {Component} from "react";
import TutorialBox from "./TutorialBox";
import ResourceBoard from "./ResourceBoard";

const tutorialTextMap = {
    0: "Hi! Welcome to Squarecraft.io. Let’s walk you through how to play.",
    1: "The objective of Squarecraft is to take the opponent’s base and defend your own",
    2: "You have two army types. Defenders are static, and can defend against up to 10 attacker hits. Attackers move around and can take other squares. ",
    3: "Attackers cost 25 shards. Press spacebar now to spawn an attacker and wasd to move it around.",
    4: "Defenders cost 100 shards. Hold alt and click a valid location to spawn a defender. Try it on this square!",
    5: "Increase your shard collection rate by taking over these shard towers.",
    6: "You can also take the vision tower for more vision.",
    7: "During real gameplay, you can't see the whole board. Move an attacker onto the other player's base to win and exit the tutorial. Have fun!",
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
            let map = document.getElementsByClassName("map")[0]
            console.log(map)
            switch(this.state.textIndex) {
                case 1:
                    console.log(map[0]);
                    document.getElementsByClassName("map")[0].children[0].children[0].children[0].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[14].classList.add("expanded");
                    break;
                case 2:
                    document.getElementsByClassName("map")[0].children[0].children[0].children[0].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[14].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[11].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[13].classList.add("expanded");
                    break;
                case 3:
                    document.getElementsByClassName("map")[0].children[0].children[0].children[11].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[13].classList.remove("expanded");
                    break;
                case 4:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[14].classList.add("flashing");
                    break;
                case 5:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[14].classList.remove("flashing")
                    document.getElementsByClassName("map")[0].children[0].children[4].children[4].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[4].children[10].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[10].children[4].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[10].children[10].classList.add("expanded");
                    break;
                case 6:
                    document.getElementsByClassName("map")[0].children[0].children[4].children[4].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[4].children[10].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[10].children[4].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[10].children[10].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[7].children[7].classList.add("expanded");
                    break;
                case 7:;
                    props.onVeil();
                    document.getElementsByClassName("map")[0].children[0].children[7].children[7].classList.remove("expanded");
                    break;
                default:
                    document.getElementsByClassName("tutorial-box")[0].style.display= "none";
            }
        }
    }

    render() {
        if (this.props.playerStatus[this.props.playerId]['status'] === "lost" || this.props.playerStatus[this.props.playerId]['status'] === "won") {
            return (
                <div>
                    <ResourceBoard displayShards={this.props.displayShards} insufficientShards={this.props.insufficientShards}/>
                    <Map
                        onReleaseMap={this.props.onReleaseMap}
                        onDragMap={this.props.onDragMap}
                        onClickMap={this.props.onClickMap}
                        playerId={this.props.playerId}
                        playerIds={this.props.playerIds}
                        squares={this.props.squares}
                        queue={this.props.queue}
                        cursor={this.props.cursor}
                        handleClick={this.props.handleClick}
                        isSpawnDefender={this.props.isSpawnDefender}
                        isInSpawningRange={this.props.isInSpawningRange}
                    />
                    <EndGame exitClick={this.props.exitClick}
                             status={this.props.playerStatus[this.props.playerId]['status']}/>
                </div>
            );
        }
            return (
                <div>
                    <ResourceBoard displayShards={this.props.displayShards} insufficientShards={this.props.insufficientShards}/>
                    <TutorialBox nextBox={this.nextBox} text={tutorialTextMap[this.state.textIndex]}/>
                    <Map
                        onReleaseMap={this.props.onReleaseMap}
                        onDragMap={this.props.onDragMap}
                        onClickMap={this.props.onClickMap}
                        playerId={this.props.playerId}
                        playerIds={this.props.playerIds}
                        squares={this.props.squares}
                        queue={this.props.queue}
                        cursor={this.props.cursor}
                        handleClick={this.props.handleClick}
                        isSpawnDefender={this.props.isSpawnDefender}
                        isInSpawningRange={this.props.isInSpawningRange}
                    />
                </div>
            );
    }
}

export default Tutorial;