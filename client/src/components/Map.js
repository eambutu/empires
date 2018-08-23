import React, {Component} from 'react';
import '../styles/Map.css';

import sword from "../sword.svg";
import base from "../base.svg";
import eye from "../eye.svg"
import shards from "../shard.svg"
import shield from "../shield.svg";
import defendedshard from "../defendedshard.svg";
import defendedeye from "../defendedeye.svg";
import defendedbase from "../defendedbase.svg";

import up_arrow from "../up_arrow.svg";
import down_arrow from "../down_arrow.svg";
import left_arrow from "../left_arrow.svg";
import right_arrow from "../right_arrow.svg";

const {SquareType, Action, UnitType} = require("./config");

const SquareColor = {
    [SquareType.UNKNOWN]: 'black',
    [SquareType.REGULAR]: 'gray',
    [SquareType.TOWER]: 'gray',
    [SquareType.WATCHTOWER]: 'gray',
    [SquareType.RIVER]: 'white'
};

export const ActionProp = {
    [Action.MOVE_DOWN]: {dx: 0, dy: 1, visual: {icon: down_arrow}},
    [Action.MOVE_UP]: {dx: 0, dy: -1, visual: {icon: up_arrow}},
    [Action.MOVE_LEFT]: {dx: -1, dy: 0, visual: {icon: left_arrow}},
    [Action.MOVE_RIGHT]: {dx: 1, dy: 0, visual: {icon: right_arrow}}
}

export default function Map(props) {
    const {squares, actionQueue, cursor, handleClick} = props;
    var actionVisuals = {};
    actionQueue.forEach((action, index) => {
        if (action.action.includes("move")) {
            let [y, x] = action.source;
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
        <table className={"map"}>
            <tbody>
            {squares.map((row, y) => (
                <tr key={y}>
                    {row.map((square, x) => (
                        <Cell
                            key={x}
                            square={square}
                            handleClick={handleClick}
                            y={y} x={x}
                            actionVisuals={(actionVisuals[y] || {})[x] || {}}
                            highlighted={cursor && cursor[1] === x && cursor[0] === y}
                        />
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
    );
}

function Cell(props) {
    const {square, highlighted, handleClick, x, y, actionVisuals} = props;
    let styleClass = "square";
    let divStyle = {
        "backgroundColor": SquareColor[square.type]
    };
    if (square.unit) {
        if (square.unit.playerId === '1') {
            divStyle = {
                "backgroundColor": 'red'
            };
        }
        else {
            divStyle = {
                "backgroundColor": 'blue'
            };
        }
    } else if (square.type === SquareType.BASE) {
        if (square.baseId === '1') {
            divStyle = {
                "backgroundColor": 'red'
            };
        } else {
            divStyle = {
                "backgroundColor": 'blue'
            };
        }
    }
    if (highlighted) {
        styleClass = styleClass + " highlighted"
    }

    let actionVisualEntries = Object.entries(actionVisuals);
    let overlayComponent = null;
    let countComponent = null;
    let text = "";

    if (square.unit) {
        countComponent = (
                <div className={"count-text"}>
                    {square.unit.count}
                </div>);
    }
    if (square.type === SquareType.BASE) {
        if (square.unit && square.unit.type === UnitType.DEFENDER) {
            styleClass = styleClass + " square-content"
            divStyle["backgroundImage"] = `url(${defendedbase})`;
        }
        else {
            styleClass = styleClass + " count-text square-content"
            divStyle["backgroundImage"] = `url(${base})`;
        }
        overlayComponent = countComponent;

    }
    else if (square.type === SquareType.WATCHTOWER) {
        if (square.unit && square.unit.type === UnitType.DEFENDER) {
            styleClass = styleClass + " square-content"
            divStyle["backgroundImage"] = `url(${defendedeye})`;
        }
        else {
            styleClass = styleClass + " count-text square-content"
            divStyle["backgroundImage"] = `url(${eye})`;
        }
        overlayComponent = countComponent;
        // overlayComponent = (
        // <div className={styleClass + "watchtower"} style={{backgroundImage: `url(${eye})`}} >
        //     {countComponent}
        // </div>
        // );
    }
    else if (square.type === SquareType.TOWER){
        if (square.unit && square.unit.type === UnitType.DEFENDER) {
            styleClass = styleClass + " square-content"
            divStyle["backgroundImage"] = `url(${defendedshard})`;
        }
        else {
            styleClass = styleClass + " count-text square-content"
            divStyle["backgroundImage"] = `url(${shards})`;
        }
        overlayComponent = countComponent;
    }
    else if (square.unit) {
        console.log(square.unit)
        console.log(square.unit.type)
        if (square.unit.type === UnitType.DEFENDER){
            divStyle["backgroundImage"] = `url(${shield})`;
        }
        else if (square.unit.type === UnitType.ATTACKER)
        {
            divStyle["backgroundImage"] = `url(${sword})`;
        }
        overlayComponent = (square.unit.count);
        styleClass = styleClass + " square-content count-text";
            {/*<div className={styleClass + "attacker count-text"} style={{backgroundImage: `url(${sword})`}}  >*/}
            {/*{square.unit.count}*/}
            {/*</div>);*/}
    } else if (actionVisualEntries.length > 0) {
        let [action, id] = actionVisualEntries[0];
        let {icon} = ActionProp[action].visual;
        if (square.type === SquareType.UNKNOWN) {
            divStyle["backgroundColor"] = "#404040";
        }
    }
    return (<td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y}>
            {overlayComponent}
    </td>);


}
