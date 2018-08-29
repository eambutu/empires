import React, {Component} from 'react';
import '../styles/Map.css';

import sword_circle from "../sword_circle.svg";
import base from "../base.svg";
import eye from "../eye.svg"
import shards from "../shards.svg"
import shield from "../shield.svg";
import defendedshard from "../defendedshard.svg";
import defendedeye from "../defendedeye.svg";
import defendedbase from "../defendedbase.svg";
import flag from "../flag.svg"

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
    [Action.MOVE_DOWN]: {dx: 0, dy: 1},
    [Action.MOVE_UP]: {dx: 0, dy: -1},
    [Action.MOVE_LEFT]: {dx: -1, dy: 0},
    [Action.MOVE_RIGHT]: {dx: 1, dy: 0}
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

        let styleClass = "square square-content count-text";


        // players on other people's bases
        if(square.unit && square.type === SquareType.BASE && square.unit.playerId !== square.baseId) {
            divStyle["border"] = "2px solid " + playerSquareColors[playerIds.indexOf(square.unit.playerId)]
            styleClass += " blinking"
            divStyle["backgroundColor"] = playerSquareColors[playerIds.indexOf(square.baseId)]
        } else if (colorId) {
            divStyle["backgroundColor"] = playerSquareColors[playerIds.indexOf(colorId)]
            divStyle["border"] = "2px solid " + playerSquareColors[playerIds.indexOf(colorId)];
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
            if (!count) {
                count = 0;
            }
            count += square.baseHP;
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
                divStyle["backgroundImage"] = `url(${sword_circle})`;
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
