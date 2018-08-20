import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import attacker from "../attacker.svg";
import base from "../base.svg";

// Cooresponds with the SquareTypeEnum in server-side code
const typeMap = {
    1: 'REGULAR',
    2: 'BASE1',
    3: 'BASE2'
};

const colorMap = {
    1: 'white',
    2: 'red',
    3: 'blue'
}

export default function Map(props) {
    const {squares, cursor, handleClick} = props;

    return (
        <table className={"map"}>
            <tbody>
            {squares.map((row, rowindex) => (
                <tr key={rowindex}>
                    {row.map((square, indexintorow) => (
                        <Cell
                            key = {indexintorow}
                            square={square}
                            handleClick={handleClick}
                            y = {rowindex}
                            x = {indexintorow}
                            highlighted={cursor[1] === indexintorow && cursor[0] === rowindex}
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
        color: colorMap[square.squareType]
    };
    if (square.unit){
        divStyle = {
            color: 'green'
        };
    }
    if (highlighted){
        console.log("hi")
        styleClass = "square-holder highlighted"
    }
    if (typeMap[square.squareType] === "BASE1" || typeMap[square.squareType] === "BASE2") {
        return <td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y}> <div className={"square"}><img src={base} /></div></td>;
    }
    else if (square.unit){
        return <td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y} unit={square.unit}> <div className={"square"}><img src={attacker} /></div></td>;
    }
    return <td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y}></td>;
}