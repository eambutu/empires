
import React from "react";
import "../styles/Chat.css";

export default function Chat(props) {
    let messages = props.messages
    let onChatMessage = props.onChatMessage;
    console.log(messages)


    let htmlMessages = messages.map(message => (
        <p className={"message"}><b>{message.name}</b>{": " + message.message}</p>
    ));
    return (
        <div className={"chat-box-holder"}>
            <div id={"message-feed"} className={"message-feed"}>
                {htmlMessages}
            </div>
            <input id="chat-input" className={"input-box"} onKeyPress={onChatMessage}></input>
        </div>
    )

}