import React, {Component} from 'react';
import * as Cookies from 'js-cookie';

import Game from './Game.js';
import HomepageButtons from "./HomepageButtons";

import '../styles/Homepage.css';

import sword from '../sword.svg';
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";

class Homepage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            menuIndex: 0,
            ffa: false,
            username: null,
            rating: 0,
            ranking: 'the worst'
        }
        this.goToPlayMenu = () => {
            this.setState({menuIndex: 1});
        }

        this.goToHomeMenu = () => {
            this.setState({menuIndex: 0, ffa: false});
        }

        this.onClickFFA = () => {
            this.setState({ffa: true})
        }

        this.onRegisterUsername = (onSuccess) => {
            console.log('onRegisterUsername');
            if (document.getElementById("username")) {
                let name = document.getElementById("username").value;
                let cookieName = Cookies.set('username', name);
                fetch('/cookies', {
                    method: 'GET',
                    credentials: 'include'
                }).then(res => res.json()).then(resJson => {
                    if (resJson.success) {
                        onSuccess();
                    } else {
                        console.log('failed register username');
                    }
                });
            }
        }

        this.onKeyPressNameForm = (e) => {
            if(e.charCode == 13) {
                e.preventDefault();
                this.onRegisterUsername(() => {});
            }
        }


    }

    componentDidMount() {
        let username = Cookies.get('username');
        if (username) {
            this.setState({'username': username});
        }

        if (username) {
            fetch('/ranking?username=' + username, {
                method: 'GET'
            }).then(res => res.json()).then(resJson => {
                this.setState({
                    rating: resJson['rating'],
                    ranking: resJson['ranking']
                });
            });
        }
    }

    render() {
        if (this.state.ffa) {
            return <Game goToHomeMenu={this.goToHomeMenu} ffa={true} />
        }
        let arrowicon = null
        if (this.state.menuIndex !== 0 ) {
            arrowicon = (
                <div id="back-arrow" onMouseLeave={() => {document.getElementById("back-arrow").style.backgroundImage = `url(${arrow})`}}
                     onMouseOver={() => {document.getElementById("back-arrow").style.backgroundImage = `url(${redarrow})`}}
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
                            <HomepageButtons
                                username={this.state.username}
                                onKeyPressNameForm={this.onKeyPressNameForm}
                                onRegisterUsername={this.onRegisterUsername}
                                onClickFFA={this.onClickFFA}
                                goToPlayMenu={this.goToPlayMenu}
                                menuIndex = {this.state.menuIndex}
                                ranking = {this.state.ranking}
                                rating = {this.state.rating}
                            />
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
