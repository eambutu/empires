import React, {Component} from 'react';
import { Route, Switch } from 'react-router-dom';
import logo from '../logo.svg';
import '../styles/App.css';
import Homepage from './Homepage.js';
import Game from './Game.js';
import RoomList from './RoomList.js';

class App extends Component {
    render() {
        const App = () => (
            <div>
                <Switch>
                    <Route exact path="/" component={Homepage}/>
                    <Route exact path="/room" component={RoomList}/>
                    <Route exact path="/room/:number" component={Game}/>
                    <Route exact path="/tutorial" component={Game}/>
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