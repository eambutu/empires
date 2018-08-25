import Map from "./Map";
import EndGame from "./EndGame";
import React, {Component} from "react";
import TutorialBox from "./TutorialBox";
import ResourceBoard from "./ResourceBoard";
import PlayerBoard from "./PlayerBoard";

const tutorialTextMap = {
    0: "Hi! Welcome to Squarecraft.io. Let’s walk you through how to play.",
    1: "The objective of Squarecraft is to capture these flags by moving your army units over them. Whoever captures 20 flags first wins.",
    2: "You have two army types. Defenders are static, and can defend against up to 5 hits. Attackers move around and can take other squares.",
    3: "Attackers cost 25 shards. Press SPACEBAR now to spawn an attacker and WASD to move it around.",
    4: "Defenders cost 100 shards. Hold the CONTROL (or COMMAND) key and CLICK a valid location to spawn a defender. Try it on this square!",
    5: "Increase your shard collection rate by moving an attacker or spawning a defender on these shard towers.",
    6: "This is your base. If any enemy attacker occupies it, they will take your flags at a steady rate. Make sure to defend it!",
    7: "During real gameplay, you can't see the whole board. You can also take the vision tower for more vision.",
    8: "Have fun!",
}


class Tutorial extends Component {

    constructor(props) {
        super(props);
        this.state = {
            textIndex: 0,
            tutorialWon: false,
        }
        this.props = props;
        this.nextBox = () => {
            console.log("hi")
            this.state.textIndex += 1;
            let map = document.getElementsByClassName("map")[0]
            console.log(map)
            switch(this.state.textIndex) {
                case 1:
                    document.getElementsByClassName("map")[0].children[0].children[8].children[8].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[10].classList.add("expanded");
                    break;
                case 2:
                    document.getElementsByClassName("map")[0].children[0].children[8].children[8].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[10].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[17].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[2].children[16].classList.add("expanded");
                    break;
                case 3:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[17].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[2].children[16].classList.remove("expanded");
                    break;
                case 4:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[18].classList.add("flashing");
                    break;
                case 5:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[18].classList.remove("flashing")
                    document.getElementsByClassName("map")[0].children[0].children[18].children[0].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[18].children[18].classList.add("expanded");


                    document.getElementsByClassName("map")[0].children[0].children[3].children[1].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[3].children[17].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[6].children[5].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[6].children[13].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[7].children[7].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[7].children[11].classList.add("expanded");

                    document.getElementsByClassName("map")[0].children[0].children[15].children[1].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[15].children[17].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[12].children[5].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[12].children[13].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[11].children[7].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[11].children[11].classList.add("expanded");


                    break;
                case 6:
                    console.log(map[0]);
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[18].children[0].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[18].children[18].classList.remove("expanded");


                    document.getElementsByClassName("map")[0].children[0].children[3].children[1].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[3].children[17].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[6].children[5].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[6].children[13].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[7].children[7].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[7].children[11].classList.remove("expanded");

                    document.getElementsByClassName("map")[0].children[0].children[15].children[1].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[15].children[17].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[12].children[5].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[12].children[13].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[11].children[7].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[11].children[11].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.add("expanded");
                    break;

                case 7:
                    props.onVeil();
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[9].classList.add("expanded");
                    break;
                case 8:;
                    document.getElementsByClassName("map")[0].children[0].children[9].children[9].classList.remove("expanded");
                    break;
                default:
                    document.getElementsByClassName("tutorial-box")[0].style.display= "none";
                    this.setState({tutorialWon: true})
            }
        }
    }

    render() {
        if (this.state.tutorialWon | this.props.playerStatus[this.props.playerId]['status'] === "lost" || this.props.playerStatus[this.props.playerId]['status'] === "won") {
            return (
                <div>
                    <PlayerBoard ffa={true} playerIds={this.props.playerIds} flags={this.props.flags} playerStatus={this.props.playerStatus}/>
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
                    <ResourceBoard displayShards={this.props.displayShards} insufficientShards={this.props.insufficientShards}/>
                    <EndGame exitClick={this.props.exitClick}
                             status={"won"}/>
                </div>
            );
        }
            return (
                <div>
                    <PlayerBoard ffa={true} playerIds={this.props.playerIds} flags={this.props.flags} playerStatus={this.props.playerStatus}/>
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
                    <ResourceBoard displayShards={this.props.displayShards} insufficientShards={this.props.insufficientShards}/>
                </div>
            );
    }
}

export default Tutorial;
