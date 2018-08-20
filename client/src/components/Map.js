import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import attacker from "../attacker.svg";
import base from "../base.svg";

// Cooresponds with the SquareTypeEnum in server-side code
const typeMap = {
    1: 'REGULAR',
    2: 'BASE',
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
                            highlighted={cursor[1] === x && cursor[0] === y}
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
    if (highlighted){
        console.log("hi")
        styleClass = "square-holder highlighted"
    }
    let content = null;
    if (typeMap[square.squareType] === "BASE") {
        content = <div className={"square"}><img src={base}/></div>;
    } else if (square.unit) {
        content = <div className={"square"}><img src={attacker}/></div>;
    }
    return <td className={styleClass} onClick={handleClick} x={x} y={y}>{content}</td>;
}
