import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import sword from '../sword.svg';
import base from "../base.svg";

import up_arrow from "../up_arrow.svg";
import down_arrow from "../down_arrow.svg";
import left_arrow from "../left_arrow.svg";
import right_arrow from "../right_arrow.svg";

const {SquareType, Action} = require("./config");

const SquareColor = {
    [SquareType.UNKNOWN]: 'black',
    [SquareType.REGULAR]: 'gray',
    [SquareType.BASE1]: 'red',
    [SquareType.BASE2]: 'blue'
};

export const ActionProp = {
    [Action.MOVE_DOWN]: { dx: 0, dy: 1, visual: {icon: down_arrow} },
    [Action.MOVE_UP]: { dx: 0, dy: -1, visual: {icon: up_arrow } },
    [Action.MOVE_LEFT]: { dx: -1, dy: 0, visual: {icon: left_arrow } },
    [Action.MOVE_RIGHT]: { dx: 1, dy: 0, visual: {icon: right_arrow } }
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
    let styleClass = "square-holder";
    let divStyle = {
        "backgroundColor": SquareColor[square.squareType]
    };
    if (square.unit) {
        if (square.unit.playerId === 1) {
            divStyle = {
                "backgroundColor": 'red'
            };
        }
        else{
            divStyle = {
                "backgroundColor": 'blue'
            };
        }
    }
    if (highlighted){
        styleClass = "square-holder highlighted"
    }
    let overlayComponents = Object.entries(actionVisuals).map(([action, id]) => {
        let {icon} = ActionProp[action].visual;
        if (square.squareType === SquareType.UNKNOWN) {
            divStyle["backgroundColor"] = "#404040";
        }
        return (<div className="overlay-component square" >
                    <object className={"icon"} key={id} type={"image/svg+xml"} data={icon}>
                        Your browser does not support SVG
                    </object>
                </div>);
    });

    let text = "";
    if (square.squareType === SquareType.BASE1 || square.squareType === SquareType.BASE2) {
        overlayComponents.push(
            <div className={"overlay-component square"}>
                <object className={"icon"} type={"image/svg+xml"} data={base}>
                    Your browser does not support SVG
                </object>
            </div>);
    } else if (square.unit) {
        overlayComponents.push(
            <div className={"overlay-component square"}>
                <object className={"icon"} type={"image/svg+xml"} data={sword}>
                    Your browser does not support SVG
                </object>
            </div>);
        text = square.unit.count;
    }
    return (<td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y}>
        <div className="overlay-wrapper" >
            <div className={square}>
                {text}
            </div>
            {overlayComponents}
        </div>
    </td>);
}
