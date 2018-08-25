import React from "react";
import '../styles/PlayerBoard.css';

export default function PlayerBoard(props) {
    const {flags, playerIds, playerStatus} = props;
    console.log(playerStatus)
    return (
        <div className={"player-table-holder"}>
            <table className={"player-table"}>
                <tbody>
                <tr>
                    <td>Player</td>
                    <td>Flags</td>
                </tr>
                {Object.values(playerStatus).map((player, index) => (
                    <PlayerRow flagcount={flags[playerIds[index]]} key={index} player={player}/>

                ))}
                </tbody>
            </table>
        </div>
    )

}


function PlayerRow(props) {
    const {flagcount, player} = props;
    return (
        <tr>
            <td>{player.name}</td>
            <td>{flagcount}</td>
        </tr>
    )
}