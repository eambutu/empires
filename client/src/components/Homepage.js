import React, {Component} from 'react';
import Game from './Game.js';

import sword from '../sword.svg';
import '../styles/Homepage.css';
import HomepageButtons from "./HomepageButtons";
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";

class Homepage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            menuIndex: 0,
            queuedGame: false
        }
        this.goToPlayMenu = () => {
            this.setState({menuIndex: 1});
        }

        this.goToHomeMenu = () => {
            this.setState({menuIndex: 0, queuedGame: false});
        }

        this.onClickFFA = () => {
            this.setState({queuedGame: true})
        }

        this.onRegisterUsername = () => {
            let name = "";
            if (document.getElementById("username")) {
                name = document.getElementById("username").value;
            }
            console.log(name);
            // z do ur shit right here
        }
    }

    render() {
        if (this.state.queuedGame) {
            return <Game goToHomeMenu={this.goToHomeMenu} queuedGame={true} />
        }
        let arrowicon = null
        if (this.state.menuIndex !== 0 ) {
            arrowicon = (
                <div id="back-arrow" onMouseLeave={() => {console.log("hi"); document.getElementById("back-arrow").style.backgroundImage = `url(${arrow})`}}
                     onMouseOver={() => {console.log('hover'); document.getElementById("back-arrow").style.backgroundImage = `url(${redarrow})`}}
                     onClick={this.goToHomeMenu}
                     style={{backgroundImage: `url(${arrow})`}}
                     className={"back-arrow"}>
                </div>
            )
        }
        return (
            <div>
                <div className="center">
                    <img src={sword} className="App-logo" alt="logo"/>
                    <div className="title">squarecraft.io</div>
                    <div className="App-text">
                        <div className="button-area">
                            <HomepageButtons onRegisterUsername={this.onRegisterUsername} onClickFFA = {this.onClickFFA} goToPlayMenu={this.goToPlayMenu} menuIndex = {this.state.menuIndex} />
                        </div>
                    </div>
                </div>
                {arrowicon}
                <div className="footer">
                    {<a href={"contact@squarecraft.io"}>Contact Us!</a>}
                </div>
            </div>
        );
    }
}

export default Homepage;