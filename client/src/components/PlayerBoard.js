import React from "react";
import '../styles/PlayerBoard.css';

import {playerSquareColors} from "./config.js"

export default function PlayerBoard(props) {
    const {ffa, flags, playerIds, playerStatus} = props;

    let rows = Object.keys(playerStatus).map((playerId, index) => (
        <PlayerRow ffa={ffa} color={playerSquareColors[playerIds.indexOf(playerId)]} flagcount={flags[playerId]} key={index} player={playerStatus[playerId]}/>
    ))
    
    return (
        <div className={"player-table-holder"}>
            <table className={"player-table"}>
                <tbody>
                <tr>
                    <td>Player</td>
                    {ffa && <td>Flags</td>}
                </tr>
                {rows}
                </tbody>
            </table>
        </div>
    )

}


function PlayerRow(props) {
    const {ffa, color, flagcount, player} = props;
    return (
        <tr>
            <td style={{backgroundColor: color, color: "white"}}>{player.name}</td>
            {ffa && <td>{flagcount}</td>}
        </tr>
    )
}
