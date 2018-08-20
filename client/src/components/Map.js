import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import attacker from "../attacker.svg";

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
    if (square.unit){
        return <td className={styleClass} onClick={handleClick} x={x} y={y} isattacker={"true"}> <img src={attacker} /></td>;
    }
    return <td className={styleClass} onClick={handleClick} x={x} y={y}></td>;
}