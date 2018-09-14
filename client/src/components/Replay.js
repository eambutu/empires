import React, {Component} from 'react';
import '../styles/Game.css';
import Map, {ActionProp} from "./Map";
import PlayerBoard from "./PlayerBoard";

const {GameType} = require("./config");

let backsize = 25;
let squaresize = 35;

let mousepos = {
    x: null,
    y: null
}

let initMapPos = {
    x: null,
    y: null
}

let downFlag = false;

class Replay extends Component {
    getInitialState() {
        return {
            playerIds: [],
            squares: null,
            shards: null,
            flags: null,
            ticks: null,
            reverseDiffs: [],
            tickIdx: 0
        };
    }

    constructor(props) {
        super(props);
        this.state = this.getInitialState();

        this.keyDownBound = e => {
            if (e.key === "=") {
                let all = document.getElementsByClassName('square');
                backsize = Math.min(backsize + 5, 45);
                squaresize = Math.min(squaresize + 5, 55);
                for (let i = 0; i < all.length; i++) {
                    all[i].style.backgroundSize = backsize.toString() + "px " + backsize.toString() + "px";
                    all[i].style.width = squaresize.toString() + "px";
                    all[i].style.height = squaresize.toString() + "px";
                    all[i].style.maxWidth = squaresize.toString() + "px";
                    all[i].style.minWidth = squaresize.toString() + "px";
                    all[i].style.maxHeight = squaresize.toString() + "px";
                    all[i].style.minHeight = squaresize.toString() + "px";

                }
            } else if (e.key === "-") {
                let all = document.getElementsByClassName('square');
                backsize = Math.max(backsize - 5, 25);
                squaresize = Math.max(squaresize - 5, 35);
                for (let i = 0; i < all.length; i++) {
                    all[i].style.backgroundSize = backsize.toString() + "px " + backsize.toString() + "px";
                    all[i].style.width = squaresize.toString() + "px";
                    all[i].style.height = squaresize.toString() + "px";
                    all[i].style.maxWidth = squaresize.toString() + "px";
                    all[i].style.minWidth = squaresize.toString() + "px";
                    all[i].style.maxHeight = squaresize.toString() + "px";
                    all[i].style.minHeight = squaresize.toString() + "px";
                }
            } else if (e.key === "ArrowRight") {
                if (this.state.tickIdx < this.state.ticks.length) {
                    let curTick = this.state.ticks[this.state.tickIdx];
                    let newSquares = this.state.squares;
                    if (this.state.tickIdx >= this.state.reverseDiffs.length) {
                        let squaresChanged = [];
                        curTick.squares.forEach((square) => {
                            squaresChanged.push(Object.assign({y: square.y, x: square.x}, this.state.squares[square.y][square.x]));
                        });
                        this.setState({ reverseDiffs: this.state.reverseDiffs.concat([squaresChanged]) });
                    }
                    curTick.squares.forEach((square) => {
                        if (square.units.length > 0) {
                            square.unit = square.units[0];
                        } else {
                            square.unit = null;
                        }
                        newSquares[square.y][square.x] = Object.assign({}, square);
                    });
                    this.setState({
                        squares: newSquares,
                        shards: curTick.shards,
                        flags: curTick.flags,
                        tickIdx: this.state.tickIdx + 1
                    });
                }
            } else if (e.key === "ArrowLeft") {
                if (this.state.tickIdx > 0) {
                    let curDiff = this.state.reverseDiffs[this.state.tickIdx - 1];
                    let curTick = this.state.ticks[this.state.tickIdx - 1];
                    let newSquares = this.state.squares;
                    curDiff.forEach((square) => {
                        if (square.units.length > 0) {
                            square.unit = square.units[0];
                        } else {
                            square.unit = null;
                        }
                        newSquares[square.y][square.x] = square;
                    });
                    this.setState({
                        squares: newSquares,
                        shards: curTick.shards,
                        flags: curTick.flags,
                        tickIdx: this.state.tickIdx - 1
                    });
                }
            }
        };

        this.onClickMap = e => {
            downFlag = true;
            // Record click position
            mousepos.x = e.clientX;
            mousepos.y = e.clientY;
            initMapPos.x = document.getElementsByClassName("map")[0].offsetLeft;
            initMapPos.y = document.getElementsByClassName("map")[0].offsetTop;

            document.getElementsByClassName("map")[0].style.position = "absolute";
            document.getElementsByClassName("map")[0].style.top = initMapPos.y + "px";
            document.getElementsByClassName("map")[0].style.left = initMapPos.x + "px";

        }

        this.onDragMap = e => {
            if (downFlag) {
                document.getElementsByClassName("map")[0].style.top = (initMapPos.y + (e.clientY - mousepos.y)) + "px";
                document.getElementsByClassName("map")[0].style.left = (initMapPos.x + (e.clientX - mousepos.x)) + "px";
            }
        }

        this.onReleaseMap = e => {
            downFlag = false;
        }
    }

    componentDidMount() {
        let splitPath = window.location.pathname.split("/");
        fetch('/get_replay/' + splitPath[splitPath.length - 1], {
            method: 'GET'
        }).then(res => res.json()).then(resJson => {
            if (resJson.success) {
                this.setState({
                    squares: resJson.initial,
                    ticks: resJson.ticks,
                    playerIds: Object.keys(resJson.result),
                    shards: resJson.ticks[0].shards,
                    flags: resJson.ticks[0].flags
                });
            } else {
                // Failed to retrieve replay. Do some error shit
            }
        });
        document.addEventListener("keydown", this.keyDownBound);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.keyDownBound);
    }

    render() {
        let {squares, playerIds, flags, shards} = this.state;
        let playerStatus = {};
        playerIds.forEach(playerId => {
            playerStatus[playerId] = {"name": playerId};
        });
        // For now, only replays for CTF
        let gameType = GameType.CTF;
        if (!squares) {
            return <div></div>
        }
        return (
            <div>
                <div id="game-page">
                    <PlayerBoard gameType={gameType} playerIds={playerIds} flags={flags} playerStatus={playerStatus} isReplay={true} shards={shards}/>
                    <Map
                        onReleaseMap={this.onReleaseMap}
                        onDragMap={this.onDragMap}
                        onClickMap={this.onClickMap}
                        playerId={null}
                        playerIds={playerIds}
                        squares={squares}
                        queue={[]}
                    />
                </div>
                <div className="footer">
                    <div style={{padding:"10px", fontSize:"18px", backgroundColor:"#222222"}}>
                        <b>Controls: </b> Use right/left arrow to go forwards/backwards in the replay <br></br>
                        Frame {this.state.tickIdx}/{this.state.ticks.length} <br></br>
                        <button className={"end-button"} style={{fontSize: "1em", minHeight: "2em"}}onClick={() => {window.location="http://squarecraft.io"}}>Go Home</button>
                    </div>
                </div>
            </div>
        );
    }

}

export default Replay;
