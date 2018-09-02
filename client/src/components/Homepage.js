import React, {Component} from 'react';
import Radium from 'radium';
import * as Cookies from 'js-cookie';

import Game from './Game.js';
import Leaderboard from "./Leaderboard"
import Instructions from "./Instructions";
import {RoomType} from "./config"
import '../styles/Homepage.css';


import sword from '../sword.png';
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";
import redglobe from "../redglobe.svg";
import globe from "../globe.svg";
import startsound from "../startsound.wav";
import redkeyboard from "../redkeyboard.svg"
import whitekeyboard from "../whitekeyboard.svg"


let HomePageOption = {
    HOME_PAGE: "home page",
    PLAY_PAGE: "play page",
    FFA_PAGE: "ffa page",
    TUTORIAL_PAGE: "tutorial page"
};

class Homepage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            page: HomePageOption.HOME_PAGE,
            leaderboard: [],
            username: undefined,
            rating: null,
            ranking: null,
            usernameFocus: false
        };

        this.hideLeaderboard = () => {
            document.getElementById("leaderboard").style.display = "none"
        };

        this.showLeaderboard = () => {
            document.getElementById("leaderboard").style.display = "block"
        };

        this.setFocusUsername = (focus) => {
            this.setState({usernameFocus: focus});
        };

        this.setPage = (page) => {
            console.log(page)
            this.setState({page: page});
        };

        this.checkOrRegisterUser = () => {
            console.log('checkOrRegisterUser');
            if (!this.state.username) {
                let newName = document.getElementById("username").value;
                if (newName.length >= 20) {
                    document.getElementById("usernameWarning").innerText = "Username is too long!";
                    document.getElementById("username").focus();
                } else if (!newName) {
                    document.getElementById("usernameWarning").innerText = "Username cannot be empty!";
                    document.getElementById("username").focus();
                } else  {
                    fetch('/set_username', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({username: newName})
                    }).then(res => res.json()).then(resJson => { // returns a promise with resolve value true if username is valid, false if not
                        if (resJson.success) { // successfully registered
                            console.log(resJson);
                            this.setState({ // no need to set rating and ranking at this time as we will be on tutorial
                                username: resJson.username
                            });
                            document.getElementById("username").disabled = true;
                            this.setPage(HomePageOption.TUTORIAL_PAGE);
                        } else { // failed to register
                            document.getElementById("usernameWarning").innerText = "Username taken! Please pick another one.";
                            document.getElementById("username").focus();
                        }
                    });
                }
            } else { // direct user to play page
                this.setPage(HomePageOption.PLAY_PAGE);
            }
        }
    }

    fetchUserInfo() {
        let session = Cookies.get('session');
        if (session) {
            fetch('/user_info', {
                method: 'GET',
                credentials: 'include'
            }).then(res => res.json()).then(resJson => {
                console.log(resJson)
                if (resJson.success) {
                    this.setState({
                        username: resJson.username,
                        rating: resJson.ratingFFA,
                        ranking: resJson.ranking
                    });
                } else {
                    // user has session but is not in database, cookie has been cleared by server
                }
            });
        }
    }

    fetchLeaderboard() {
        fetch('/leaderboard').then(res => res.json()).then(resJson => {
            this.setState({
                leaderboard: resJson
            });
        });
    }

    componentDidMount() {
        this.fetchUserInfo();
        this.fetchLeaderboard();
    }

    componentDidUpdate(prevProps, prevState) {
        let pagesNeedRanking = [HomePageOption.HOME_PAGE, HomePageOption.PLAY_PAGE];
        if (pagesNeedRanking.includes(this.state.page) && prevState.page !== this.state.page) {
            this.fetchUserInfo();
            this.fetchLeaderboard();
        }
    }

    render() {
        if (this.state.page === HomePageOption.FFA_PAGE) {
            return <Game goToHomeMenu={() => this.setPage(HomePageOption.HOME_PAGE)} roomType={RoomType.FFA} />
        } else if (this.state.page === HomePageOption.TUTORIAL_PAGE) {
            return <Game goToHomeMenu={() => this.setPage(HomePageOption.HOME_PAGE)} roomType={RoomType.TUTORIAL} />
        }
        let arrowicon = null
        if (this.state.page === HomePageOption.PLAY_PAGE) {
            arrowicon = (
                <div id="back-arrow" onMouseLeave={() => {document.getElementById("back-arrow").style.backgroundImage = `url(${arrow})`}}
                     onMouseOver={() => {document.getElementById("back-arrow").style.backgroundImage = `url(${redarrow})`}}
                     onClick={() => this.setPage(HomePageOption.HOME_PAGE)}
                     style={{backgroundImage: `url(${arrow})`}}
                     className={"back-arrow"}>
                </div>
            )
        }

        return (
            <div>
                <div id={"leaderboard"} className="pop-up-board center" style={{display: "none"}}>
                    <Leaderboard hideLeaderboard={this.hideLeaderboard} leaderboard={this.state.leaderboard}/>
                </div>

                <Instructions hideInstructions={this.hideInstructions}/>

                <div className="center">
                    <img onClick={() => {this.setPage(HomePageOption.HOME_PAGE)}} src={sword} className="App-logo" alt="logo"/>
                    <div onClick={() => {this.setPage(HomePageOption.HOME_PAGE)}} style={{cursor: "pointer"}} className="title">squarecraft.io</div>
                    <div className="App-text">
                        <div className="button-area">
                            <HomepageButtons
                                showLeaderboard={this.showLeaderboard}
                                username={this.state.username}
                                checkOrRegisterUser={this.checkOrRegisterUser}
                                setPage={this.setPage}
                                page={this.state.page}
                                ranking={this.state.ranking}
                                rating={this.state.rating}
                                setFocusUsername={this.setFocusUsername}
                                usernameFocus={this.state.usernameFocus}
                            />
                        </div>
                    </div>
                </div>
                {arrowicon}
                <div className="footer">
                    <div style={{paddingTop:"10px", fontSize:"18px"}}>
                        {/*<marquee style={{width: "180px"}}behavior="scroll" direction="left">*/}
                        <b>Beta Tournament ends 9/4</b>: $50 Rank 1, $20 Rank 2, $10 Rank 3
                        {/*</marquee>*/}
                    </div>
                    {<a href={"mailto:contact@squarecraft.io"}>Contact Us!</a>}
                </div>
            </div>
        );
    }
}

function HomepageButtons(props) {
    const {showLeaderboard, checkOrRegisterUser, setPage, page, username, rating, ranking, setFocusUsername, usernameFocus} = props;
    console.log('page', page);

    let onEnterKeyPress = e => {
        if (e.charCode === 13) {
            console.log("key press enter");
            e.preventDefault();
            checkOrRegisterUser();
        }
    };
    let common = (
        <div>
            <div className={"rating-text"} style={{visibility: rating === null ? "hidden": "visible"}} >
                Rating: {rating} <br/>
            </div>
            <div style={{visibility: ranking === null ? "hidden": "visible", alignItems: "center", justifyContent: "center", display: "flex", fontSize: "20px"}}>
                (Rank: {ranking})
                <div id={"globe"} className={"globe"} onClick={showLeaderboard}
                    style={{
                        backgroundImage: `url(${globe})`,
                        ':hover': {
                            backgroundImage: `url(${redglobe})`
                        }
                    }}>
                </div>
            </div>
            <form onKeyPress={username ? onEnterKeyPress : undefined} action="#">
                <input disabled={username ? true : undefined} onFocus={() => setFocusUsername(true)} onBlur={() => setFocusUsername(false)} autoComplete="off" type="text" id="username" placeholder="Username" value={username}/> <br/>
            </form>
            <div id={"usernameWarning"} style={{visibility: usernameFocus ? "visible" : "hidden", fontSize: "12px", color: "#ff4136"}}>
                Careful! You can only set your username once.
            </div>
        </div>
    );
    switch (page) {
        case HomePageOption.HOME_PAGE:
            return (
                <div id={"homepage-buttons"}>
                    {common}
                    <button className="homepage-button" onClick={checkOrRegisterUser}>Play!</button>
                    <br/>
                    <button className="homepage-button" onClick={() => setPage(HomePageOption.TUTORIAL_PAGE)}>Tutorial</button>
                </div>
            );
        case HomePageOption.PLAY_PAGE:
            return (
                <div id={"play-buttons"}>
                    {common}
                    <button id="ffa-game-button" className="homepage-button" onClick={() => setPage(HomePageOption.FFA_PAGE)}>FFA</button>
                    <br/>
                    <button id="custom-game-button" className="homepage-button" onClick={() => {window.location = "/room/"}}>Custom Game</button>
                </div>
            );
        default:
            return null;
    }
}

HomepageButtons = Radium(HomepageButtons);

export default Homepage;
