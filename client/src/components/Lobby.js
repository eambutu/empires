import React from 'react';
import '../styles/Lobby.css';

export default function Lobby(props) {
    const {onPlayerReady, playerIds, playerStatus, waitingText} = props;
    console.log(playerStatus)
    console.log(playerIds)
    return (
        <div className={"center"}>
            {waitingText}
            {playerIds}
            <button onClick={onPlayerReady}> hi </button>
        </div>
    )

}