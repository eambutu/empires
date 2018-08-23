import React, {Component} from 'react';
import attacker from '../attacker.svg';
import '../styles/Lobby.css';

export default function Lobby(props) {
    const {playerStatus} = props;
    console.log(playerStatus)
    return (
        <div>
            Connected! Waiting for other player...
        </div>
    )

}