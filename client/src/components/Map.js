import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import sword from '../sword.svg'
import base from "../base.svg";

var SquareType = require("./config").SquareType;

const colorMap = {
    [SquareType.UNKNOWN]: 'black',
    [SquareType.REGULAR]: 'gray',
    [SquareType.BASE1]: 'red',
    [SquareType.BASE2]: 'blue'
};

export default function Map(props) {
    const {squares, cursor, handleClick} = props;
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
    const {square, highlighted, handleClick, x, y} = props;
    let styleClass = "square-holder";
    let divStyle = {
        "backgroundColor": colorMap[square.squareType]
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

    let content = null;
    if (square.squareType === SquareType.BASE1 || square.squareType === SquareType.BASE2) {
        content = <div className={"square"}>
                    <object className={"icon"} type={"image/svg+xml"} data={base}>
                        Your browser does not support SVG
                    </object>
                  </div>;
    } else if (square.unit) {
        content = <div className={"square"}>
                    <object className={"icon"} type={"image/svg+xml"} data={sword}>
                        Your browser does not support SVG
                    </object>
                  </div>;
    }
    return <td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y}>{content}</td>;
}
