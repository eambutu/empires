import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import attacker from "../attacker.svg";
import castle from "../castle.svg";

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
                            highlighted={cursor[1] == indexintorow && cursor[0] == rowindex}
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
    let styleClass = "square"
    if (highlighted){
        styleClass = "square highlighted"
    }
    if (typeMap[square.type] === "base") {
        return <td className={styleClass} onClick={handleClick} x={x} y={y} isattacker={"true"}> <img src={castle} /></td>;
    }
    else if (square.unit) {
        return <td className={styleClass} onClick={handleClick} x={x} y={y} isattacker={"true"}> <img src={attacker} /></td>;
    }
    return <td className={styleClass} onClick={handleClick} x={x} y={y}></td>;
}