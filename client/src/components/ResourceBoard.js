import React from "react";
import '../styles/ResourceBoard.css';

export default function ResourceBoard(props) {
    const {shards} = props;


    return(
        <div>
            {shards}
        </div>
    )

}