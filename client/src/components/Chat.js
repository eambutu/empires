
import React from "react";
import "../styles/Chat.css";
import {MaxMessageLength, AdminUsername} from "./config.js"


export default function Chat(props) {
    let messages = props.messages
    let onChatMessage = props.onChatMessage;

    let htmlMessages = messages.map(message => (
        <p style={message.username === AdminUsername ? {color: 'Red'} : {}} className={"message"}><b>{message.username}</b>{": " + message.message}</p>
    ));
    return (
        <div className={"chat-box-holder"}>
            <div id={"message-feed"} className={"message-feed"}>
                {htmlMessages}
            </div>
            <input id="chat-input" className={"input-box"} onKeyPress={onChatMessage} maxlength={MaxMessageLength} placeholder="enter message"></input>
        </div>
    )

}