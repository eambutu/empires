import React, {Component} from 'react';
import { Route, Switch } from 'react-router-dom';
import '../styles/App.css';
import Homepage from './Homepage.js';
import Game from './Game.js';
import Replay from './Replay.js';
import RoomList from './RoomList.js';
import {RoomType} from './config.js';

class App extends Component {
    render() {
        const App = () => (
            <div>
                <Switch>
                    <Route exact path="/" component={Homepage}/>
                    <Route exact path="/room" component={RoomList}/>
                    <Route exact path="/room/:number" render={() => <Game roomType={RoomType.CUSTOM} />} />
                    <Route exact path="/replay/:gameId" component={Replay}/>
                </Switch>
            </div>
        )

        return (
            <Switch>
                <App/>
            </Switch>
        );
    }
}

export default App;