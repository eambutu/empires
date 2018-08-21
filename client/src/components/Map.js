import React, { Component } from 'react';
import {SquareType} from "./config"
import logo from '../logo.svg';
import '../styles/Map.css';
import attacker from "../attacker.svg";
import base from "../base.svg";


const colorMap = {
    [SquareType.REGULAR]: 'black',
    [SquareType.BASE1]: 'red',
    [SquareType.BASE2]: 'blue'
};

export default function Map(props) {
    const {player, squares, cursor, handleClick} = props;

    return (
        <table className={"map"}>
            <tbody>
            {squares.map((row, y) => (
                <tr key={y}>
                    {row.map((square, x) => (
                        <Cell
                            player={player}
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
    const {player, square, highlighted, handleClick, x, y} = props;
    let styleClass = "square-holder";
    let divStyle = {
        "background-color": colorMap[square.squareType]
    };
    if (square.unit){
        if (player === 1) {
            divStyle = {
                "background-color": 'red'
            };
        }
        else{
            divStyle = {
                "background-color": 'blue'
            };
        }
    }
    if (highlighted){
        console.log("hi")
        styleClass = "square-holder highlighted"
    }

    let content = null;
    if (square.squareType === SquareType.BASE1 || square.squareType === SquareType.BASE2) {
        content = <div className={"square"}>
                    <object type={"image/svg+xml"} data={base}>
                        Your browser does not support SVG
                    </object>
                  </div>;
    } else if (square.unit) {
        content = <div className={"square"}>
                    <object type={"image/svg+xml"} data={attacker}>
                        Your browser does not support SVG
                    </object>
                  </div>;
    }
    return <td className={styleClass} style={divStyle} onClick={handleClick} x={x} y={y}>{content}</td>;
}
