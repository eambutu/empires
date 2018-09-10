import React, {Component} from 'react';
import '../styles/Game.css';
import Map, {ActionProp} from "./Map";
import PlayerBoard from "./PlayerBoard";

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
                    let squaresChanged = this.state.squares;
                    curTick.squares.forEach((square) => {
                        if (square.units.length > 0) {
                            square.unit = square.units[0];
                        } else {
                            square.unit = null;
                        }
                        squaresChanged[square.y][square.x] = square;
                    });
                    this.setState({
                        squares: squaresChanged,
                        shards: curTick.shards,
                        flags: curTick.flags,
                        tickIdx: this.state.tickIdx + 1
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
        let pathname = window.location.pathname;
        fetch(pathname, {
            method: 'GET'
        }).then(res => res.json()).then(resJson => {
            if (resJson.success) {
                this.setState({
                    squares: resJson.initial,
                    ticks: resJson.ticks,
                    playerIds: Object.keys(resJson.result)
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
        let {squares, playerStatus, playerId, playerIds, flags} = this.state;
        console.log(squares);
        //<PlayerBoard gameType={this.state.gameType} playerIds={playerIds} flags={flags} playerStatus={playerStatus}/>
        if (!squares) {
            return <div></div>
        }
        return (
            <div id="game-page">
                <Map
                    onReleaseMap={this.onReleaseMap}
                    onDragMap={this.onDragMap}
                    onClickMap={this.onClickMap}
                    playerId={playerId}
                    playerIds={playerIds}
                    squares={squares}
                    queue={[]}
                />
            </div>
        );
    }

}

export default Replay;
