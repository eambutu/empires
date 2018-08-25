import React from "react";
import '../styles/PlayerBoard.css';

import {playerSquareColors} from "./config.js"

export default function PlayerBoard(props) {
    const {flags, playerIds, playerStatus} = props;
    console.log(playerStatus)

    let rows = Object.values(playerStatus).map((player, index) => (
        <PlayerRow color={playerSquareColors[index]} flagcount={flags[playerIds[index]]} key={index} player={player}/>
    ))

    return (
        <div className={"player-table-holder"}>
            <table className={"player-table"}>
                <tbody>
                <tr>
                    <td>Player</td>
                    <td>Flags</td>
                </tr>
                {rows}
                </tbody>
            </table>
        </div>
    )

}


function PlayerRow(props) {
    const {color, flagcount, player} = props;
    return (
        <tr>
            <td style={{backgroundColor: color, color: "white"}}>{player.name}</td>
            <td>{flagcount}</td>
        </tr>
    )
}