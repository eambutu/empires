import React from "react";
import '../styles/PlayerBoard.css';

export default function PlayerBoard(props) {
    const {playerStatus} = props;

    return(
        <div className={"player-table-holder"}>
            <table className={"player-table"}>
                <tbody>
                {Object.values(playerStatus).map((player, playerid) => (
                    <PlayerRow key={playerid} player={player} />

                    ))}
                </tbody>
            </table>
        </div>
    )

}


function PlayerRow(props){
    const {player} = props;
    return (
        <tr>
            <td>{player.name}</td>
            <td>{player.status}</td>
        </tr>
    )
}