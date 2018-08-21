import React from "react";
import '../styles/ResourceBoard.css';
import shard from '../shard.svg'

export default function ResourceBoard(props) {
    const {displayShards} = props;

    return (
        <div className={"resource-info"}>
            <div className={"shard-count"}>
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