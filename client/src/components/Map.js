import React, {Component} from 'react';
import '../styles/Map.css';

import sword from "../sword.svg";
import base from "../base.svg";
import eye from "../eye.svg"
import shards from "../shards.svg"
import shield from "../shield.svg";
import defendedshard from "../defendedshard.svg";
import defendedeye from "../defendedeye.svg";
import defendedbase from "../defendedbase.svg";
import flag from "../flag.svg"

import up_arrow from "../up_arrow.svg";
import down_arrow from "../down_arrow.svg";
import left_arrow from "../left_arrow.svg";
import right_arrow from "../right_arrow.svg";

const {SquareType, Action, UnitType, playerSquareColors} = require("./config");

const SquareColor = {
    [SquareType.UNKNOWN]: 'black',
    [SquareType.REGULAR]: 'gray',
    [SquareType.TOWER]: 'gray',
    [SquareType.WATCHTOWER]: 'gray',
    [SquareType.RIVER]: 'white',
    [SquareType.FLAG]: 'gray'
};

export const ActionProp = {
    [Action.MOVE_DOWN]: {dx: 0, dy: 1, visual: {icon: down_arrow}},
    [Action.MOVE_UP]: {dx: 0, dy: -1, visual: {icon: up_arrow}},
    [Action.MOVE_LEFT]: {dx: -1, dy: 0, visual: {icon: left_arrow}},
    [Action.MOVE_RIGHT]: {dx: 1, dy: 0, visual: {icon: right_arrow}}
}

export default function Map(props) {
    const {onReleaseMap, onDragMap, onClickMap, playerId, playerIds, squares, queue, cursor, handleClick, isSpawnDefender, isInSpawningRange} = props;
    var actionVisuals = {};
    queue.forEach((action) => {
        if (action.action.includes("move")) {
            let [y, x] = action.target;
            if (!(y in actionVisuals)) {
                actionVisuals[y] = {};
            }
            let row = actionVisuals[y];
            if (!(x in row)) {
                row[x] = {};
            }
            row[x][action.action] = action.id;
        }
    });
    return (
        <table className={"map"} onMouseDown={onClickMap} onMouseLeave={onReleaseMap} onMouseUp={onReleaseMap} onMouseMove={onDragMap}>
            <tbody>
            {squares.map((row, y) => (
                <tr key={y}>
                    {row.map((square, x) => (
                        <Cell
                            playerId={playerId}
                            playerIds={playerIds}
                            key={x}
                            square={square}
                            handleClick={handleClick}
                            y={y} x={x}
                            actionVisuals={(actionVisuals[y] || {})[x] || {}}
                            highlighted={cursor && cursor[1] === x && cursor[0] === y}
                            isSpawnDefender={isSpawnDefender}
                            isInSpawningRange={isInSpawningRange}
                        />
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
    );
}

class Cell extends Component {
    constructor(props) {
        super(props)
        this.state = {
            isHover: false,
        };

        this.handleMouseEnter = this.handleMouseEnter.bind(this, this.props.handleMouseEnter);
        this.handleMouseLeave = this.handleMouseLeave.bind(this, this.props.handleMouseLeave);
    }

    handleMouseEnter(e) {
        this.setState({isHover: true});
    }

    handleMouseLeave(e) {
        this.setState({isHover: false});
    }

    render () {
        const {playerId, playerIds, square, highlighted, handleClick, x, y, actionVisuals, isSpawnDefender, isInSpawningRange} = this.props;
        let renderSpawnDefender = this.state.isHover && isSpawnDefender && isInSpawningRange(y, x) && !square.isFog;

        // background color
        let divStyle = {
            "backgroundColor": SquareColor[square.type]
        };
        let actionVisualEntries = Object.entries(actionVisuals);
        if (actionVisualEntries.length > 0 && square.type !== SquareType.RIVER) {
            let [action, id] = actionVisualEntries[0];
            let {icon} = ActionProp[action].visual;
            divStyle["backgroundColor"] = "#505050";
            divStyle["border"] = "2px solid #505050";
        }
        if (square.isFog) {
            divStyle["opacity"] = 0.2;
        }
        let colorId;
        if (square.unit) {
            colorId = square.unit.playerId;
        } else if (square.type === SquareType.BASE) {
            colorId = square.baseId;
        } else if (renderSpawnDefender) {
            divStyle["opacity"] = "0.5";
            colorId = playerId;
        }
        if (colorId) {
            divStyle["backgroundColor"] = playerSquareColors[playerIds.indexOf(colorId)]
            divStyle["border"] = "2px solid " + playerSquareColors[playerIds.indexOf(colorId)];
        }

        let styleClass = "square square-content count-text";

        // players on other people's bases
        if(square.unit && square.type === SquareType.BASE && square.unit.playerId !== square.baseId){
            console.log(playerIds.indexOf(square.baseId));
            console.log(square.unit.playerId)
            divStyle["border"] = "solid " + playerSquareColors[playerIds.indexOf(square.unit.playerId)]
            styleClass += " blinking"
            divStyle["backgroundColor"] = playerSquareColors[playerIds.indexOf(square.baseId)]
            divStyle["border"] = "2px solid " + playerSquareColors[playerIds.indexOf(square.baseId)];
        }

        if (highlighted) {
            styleClass += " highlighted"
        }
        // background image and count
        let count = null;
        if (square.unit) {
            count = square.unit.count;
        }
        if (square.type === SquareType.BASE) {
            if ((square.unit && square.unit.type === UnitType.DEFENDER) || renderSpawnDefender) {
                divStyle["backgroundImage"] = `url(${defendedbase})`;
            }
            else {
                divStyle["backgroundImage"] = `url(${base})`;
            }
            if (square.baseHP === 0) { // dead
                count = 0;
            } else if (square.unit) { // has player's own units
                count += square.baseHP;
            } else { // doesn't have player's own units
                count = square.baseHP;
            }
        } else if (square.type === SquareType.WATCHTOWER) {
            if ((square.unit && square.unit.type === UnitType.DEFENDER) || renderSpawnDefender) {
                divStyle["backgroundImage"] = `url(${defendedeye})`;
            }
            else {
                divStyle["backgroundImage"] = `url(${eye})`;
            }
        } else if (square.type === SquareType.TOWER) {
            if ((square.unit && square.unit.type === UnitType.DEFENDER) || renderSpawnDefender) {
                divStyle["backgroundImage"] = `url(${defendedshard})`;
            }
            else {
                divStyle["backgroundImage"] = `url(${shards})`;
            }

        } else if (square.type === SquareType.FLAG) {
            divStyle["backgroundImage"] = `url(${flag})`;
        } else if (square.unit) {
            if (square.unit.type === UnitType.DEFENDER){
                divStyle["backgroundImage"] = `url(${shield})`;
            }
            else if (square.unit.type === UnitType.ATTACKER)
            {
                divStyle["backgroundImage"] = `url(${sword})`;
            }
        } else if (renderSpawnDefender) {
            divStyle["backgroundImage"] = `url(${shield})`;
        }

        return (
            <td
                className={styleClass}
                style={divStyle}
                onClick={handleClick}
                x={x}
                y={y}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
            >
                {count}
            </td>
        );
    }
}
