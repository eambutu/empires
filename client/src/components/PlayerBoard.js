import React from "react";
import '../styles/PlayerBoard.css';

import {playerSquareColors, GameType} from "./config.js"

export default function PlayerBoard(props) {
    const {gameType, flags, playerIds, playerStatus, isReplay, shards} = props;

    let rows = Object.keys(playerStatus).map((playerId, index) => (
        <PlayerRow
            gameType={gameType}
            color={playerSquareColors[playerIds.indexOf(playerId)]}
            flagcount={flags[playerId]}
            key={index}
            player={playerStatus[playerId]}
            isReplay={isReplay}
            shardcount={shards[playerId]}
        />
    ))
    
    return (
        <div className={"player-table-holder"}>
            <table className={"player-table"}>
                <tbody>
                <tr>
                    <td>Player</td>
                    {gameType === GameType.CTF && <td>Flags</td>}
                    {isReplay && <td>Shards</td>}
                </tr>
                {rows}
                </tbody>
            </table>
        </div>
    )

}


function PlayerRow(props) {
    const {gameType, color, flagcount, player, isReplay, shardcount} = props;
    return (
        <tr>
            <td style={{backgroundColor: color, color: "white"}}>{player.name}</td>
            {gameType === GameType.CTF && <td>{flagcount}</td>}
            {isReplay && <td>{shardcount}</td>}
        </tr>
    )
}
