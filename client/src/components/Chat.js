
import React from "react";
import "../styles/Chat.css";
import {MaxMessageLength, AdminUsername} from "./config.js"

function formatTime(timestamp) {
    let date = new Date(timestamp);
    let hour = "0" + date.getHours();
    let min = "0" + date.getMinutes();
    let sec = "0" + date.getSeconds();

    return hour.substr(-2) + ':' + min.substr(-2) + ':' + sec.substr(-2);
}


export default function Chat(props) {
    let messages = props.messages
    let onChatMessage = props.onChatMessage;

    let htmlMessages = messages.map(message => {
        return  <p style={message.username === AdminUsername ? {color: 'Red'} : {}} className={"message"}>
                    {formatTime(message.timestamp)} <b>{message.username}</b>{": " + message.message}
                </p>
    });

    return (
        <div className={"chat-box-holder"}>
            <div id={"message-feed"} className={"message-feed"}>
                {htmlMessages}
            </div>
            <input id="chat-input" className={"input-box"} onKeyPress={onChatMessage} maxlength={MaxMessageLength} placeholder="enter message"></input>
        </div>
    )

}