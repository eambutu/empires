import React from "react";
import '../styles/ResourceBoard.css';
import shard from '../shard_icon.svg'

export default function ResourceBoard(props) {
    const {displayShards, insufficientShards} = props;

    return (
        <div className={"resource-info"}>
            <div className={insufficientShards ? "shard-count shard-red" : "shard-count"}>
                <span>
                    <object className={"shards-icon"} type={"image/svg+xml"} data={shard}>
                        Your browser does not support SVG
                    </object>
                    {displayShards}
                </span>
            </div>
        </div>
    )

}