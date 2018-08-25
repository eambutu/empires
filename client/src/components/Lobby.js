import React from 'react';
import '../styles/Lobby.css';

export default function Lobby(props) {
    const {playerStatus, waitingText} = props;
    console.log(playerStatus)
    return (
        <div className={"center"}>
            {waitingText}
        </div>
    )

}