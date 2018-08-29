import React from 'react';
import "../styles/Homepage.css"

export default function Leaderboard(props) {
    let {hideLeaderboard, leaderboard} = props;
    console.log(leaderboard)
    let leaders = leaderboard.map(leader => (
        <tr key={leader.ranking}>
            <td> {leader.ranking + 1} </td>
            <td> {leader.username} </td>
            <td> {Math.round(leader.ratingFFA)} </td>
        </tr>
    ));

    return (
        <div>
            <h1 style={{color: "black"}}> Global Leaderboard </h1>
                <div className={"pop-up-table-holder"}>
                    <table cellSpacing={0} className={"pop-up-table"} >
                        <tbody>
                        <tr>
                            <td> <b>Rank</b> </td>
                            <td> <b>Username</b></td>
                            <td> <b>ELO</b></td>
                        </tr>
                        {leaders}
                        </tbody>
                    </table>
                </div>
            <button onClick={hideLeaderboard}>Close</button>
        </div>
    )
}