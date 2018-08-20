import React, { Component } from 'react';
import logo from '../logo.svg';
import '../styles/Map.css';
import attacker from "../attacker.svg";

export default function Map(props) {
    const {squares} = props;


    return (
        <table className={"map"}>
            <tbody>
            {squares.map((row, col) => (
                <tr key={col}>
                    {row.map((square, indexintorow) => (
                        <Cell
                            key = {indexintorow}
                            square={square}
                            // isPlayer={x == tx && y == ty}
                        />
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
    );
}

function Cell(props) {
    const {square} = props;
    if (square.unit){
        return <td className={"square"} > <img src={attacker} /></td>;
    }
    return <td className={"square"} ></td>;
}