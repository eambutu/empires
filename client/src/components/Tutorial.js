import Map from "./Map";
import EndGame from "./EndGame";
import React, {Component} from "react";
import TutorialBox from "./TutorialBox";
import ResourceBoard from "./ResourceBoard";
import PlayerBoard from "./PlayerBoard";

const tutorialTextMap = {
    0: "Hi! Welcome to Squarecraft.io. Let’s walk you through how to play.",
    1: "The objective of Squarecraft is to capture these flags by moving your army units over them. They continuously spawn in the middle region. Whoever captures 20 flags first wins.",
    2: "You have two army types. Defenders are immobile, and can defend against up to 5 hits. Attackers move around and can take other squares.",
    3: "Attackers cost 25 shards and only spawn from next to your base. Press SPACEBAR now to spawn an attacker and WASD to move it around. You can also RIGHT CLICK to move a selected unit to a square. Try moving a spawned attacker to the highlighted square, either with WASD or RIGHT CLICK.",
    4: "Defenders cost 100 shards. Hold the CONTROL (or COMMAND) key and CLICK a location to spawn a defender. Defenders can spawn on buildings, stack, but can't be spawned on top of attackers. Try spawning a defender on your base and this square!",
    5: "Increase your shard collection economy by moving an attacker or spawning a defender on these shard towers.",
    6: "This is your base. If any enemy attacker occupies it, they will take your flags at a steady rate, and you'll have to run your own attackers into it to regain control. Make sure to defend it!",
    7: "During real gameplay, you can't see the whole board. You can also take the vision tower for more vision.",
    8: "Click a specific attacker to select and move it, or use the E key to cycle through your attackers.",
    9: "Have fun!",
}


class Tutorial extends Component {

    constructor(props) {
        super(props);
        this.state = {
            textIndex: 0,
            tutorialWon: false,
        }
        this.props = props;
        this.animateTutorial = () => {
            switch(this.state.textIndex) {
                case 0:
                    document.getElementsByClassName("map")[0].children[0].children[8].children[8].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[10].classList.remove("expanded");
                    break;
                case 1:
                    document.getElementsByClassName("map")[0].children[0].children[8].children[8].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[10].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[17].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[2].children[16].classList.remove("expanded");
                    break;
                case 2:
                    document.getElementsByClassName("map")[0].children[0].children[8].children[8].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[10].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[17].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[2].children[16].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[10].children[5].classList.remove("flashing");
                    break;
                case 3:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[17].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[2].children[16].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[18].classList.remove("flashing");
                    document.getElementsByClassName("map")[0].children[0].children[10].children[5].classList.add("flashing");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.remove("flashing");

                    break;
                case 4:
                    document.getElementsByClassName("map")[0].children[0].children[10].children[5].classList.remove("flashing");
                    document.getElementsByClassName("map")[0].children[0].children[1].children[18].classList.add("flashing");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.add("flashing");
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
                    break;
                case 5:
                    document.getElementsByClassName("map")[0].children[0].children[1].children[18].classList.remove("flashing")
                    document.getElementsByClassName("map")[0].children[0].children[18].children[0].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[18].children[18].classList.add("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.remove("flashing");


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
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.remove("expanded");

                    break;
                case 6:
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
                    document.getElementsByClassName("map")[0].children[0].children[9].children[9].classList.remove("expanded");
                    break;

                case 7:
                    props.onVeil();
                    document.getElementsByClassName("map")[0].children[0].children[0].children[18].classList.remove("expanded");
                    document.getElementsByClassName("map")[0].children[0].children[9].children[9].classList.add("expanded");
                    break;
                case 8:
                    document.getElementsByClassName("map")[0].children[0].children[9].children[9].classList.remove("expanded");
                    break;
                case 9:
                    break;
                default:
                    document.getElementsByClassName("tutorial-box")[0].style.display = "none";
                    this.setState({tutorialWon: true})
            }

        }


        this.prevBox = () => {
            console.log(this.state.textIndex)
            if (this.state.textIndex > 0){
                this.state.textIndex -= 1;
                this.animateTutorial()
            }
        }
        this.nextBox = () => {
            console.log("hi")
            this.state.textIndex += 1;
            let map = document.getElementsByClassName("map")[0]
            console.log(map)
            this.animateTutorial();
        }
        this.skipTutorial = () => {
            this.state.textIndex = -1;
            this.animateTutorial();
        }
    }

    render() {
        if (this.state.tutorialWon | this.props.playerStatus[this.props.playerId]['status'] === "lost" || this.props.playerStatus[this.props.playerId]['status'] === "won") {
            return (
                <div>
                    <PlayerBoard gameType={this.props.gameType} playerIds={this.props.playerIds} flags={this.props.flags} playerStatus={this.props.playerStatus} isReplay={false}/>
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
                    <PlayerBoard gameType={this.props.gameType} playerIds={this.props.playerIds} flags={this.props.flags} playerStatus={this.props.playerStatus} isReplay={false}/>
                    <TutorialBox index={this.state.textIndex} prevBox={this.prevBox} nextBox={this.nextBox} text={tutorialTextMap[this.state.textIndex]}/>
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
                    {/*<div className={"button-holder"}>*/}
                        {/*<button className={"tutorial-button"} onClick={this.skipTutorial}>Skip Tutorial</button>*/}
                    {/*</div>*/}
                </div>
            );
    }
}

export default Tutorial;
