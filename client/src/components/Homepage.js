import React, {Component} from 'react';
import sword from '../sword.svg';
import '../styles/Homepage.css';
import HomepageButtons from "./HomepageButtons";
import arrow from "../arrow.svg";
import redarrow from "../redarrow.svg";

class Homepage extends Component {
    constructor(props){
        super(props);

        this.state = {
            menuIndex: 0,
        }
        this.goToPlayMenu = () => {
            console.log("hi")
            this.setState({"menuIndex" :1});
        }

        this.goToHomeMenu = () => {
            this.setState({"menuIndex" : 0});
        }

        this.onClickFFA = () => {
            console.log("FFA!!")
        }

    }

    componentDidMount() {
        // Call our fetch function below once the component mounts
        this.callBackendAPI()
            .then(res => this.setState({data: res.express}))
            .catch(err => console.log(err));
    }

    // Fetches our GET route from the Express server. (Note the route we are fetching matches the GET route from server.js
    callBackendAPI = async () => {
        const response = await fetch('/express_backend');
        const body = await response.json();

        if (response.status !== 200) {
            throw Error(body.message)
        }
        return body;
    };

    render() {
        let arrowicon = null
        if (this.state.menuIndex !== 0 ){
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
                            <HomepageButtons onClickFFA = {this.onClickFFA} goToPlayMenu={this.goToPlayMenu} menuIndex = {this.state.menuIndex} />
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