import React from 'react';
import "../styles/Homepage.css"

export default function Leaderboard(props) {
    let {hideLeaderboard, leaderboard} = props;
    console.log(leaderboard)
    let leaders = leaderboard.map(leader => (
        <tr key={leader.ranking}>
            <td> {leader.ranking} </td>
            <td> {leader.username} </td>
            <td> {leader.ratingFFA} </td>
        </tr>
    ));

    return (
        <div>
            <h1 style={{color: "black"}}> Global Leaderboard </h1>
                <div className={"leader-table-holder"}>
                    <table cellSpacing={0} className={"leaders"} >
                        <tbody>
                        {leaders}
                        </tbody>
                    </table>
                </div>
            <button onClick={hideLeaderboard}>Close</button>
        </div>
    )
}