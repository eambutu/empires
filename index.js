var express = require('express');
var cache = require('memory-cache');
var app = express();
var expressWs = require('express-ws')(app);
var path = require('path');
var wss = expressWs.getWss('/');

id1 = 1729;
id2 = 1618;
ts = 1000 / 2;
game = null;
sockets = {1: null, 2: null};
names = {1: 'player_1', 2: 'player_2'};
moves = [];



app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.ws('/', function (ws, req) {
    ws.isAlive = true;
    ws.on('message', function (msg) {
        ws.isAlive = true;
        data = JSON.parse(msg);
        if (data.id === id1) {
            cache.put('playerOneMove', data.action);
            data.player = 1;
            moves.push(data);
        }
        else if (data.id === id2) {
            cache.put('playerTwoMove', data.action);
            data.player = 2;
            moves.push(data);
        }
    });

    if (game !== 'null') {
        if (wss.clients.size === 1) {
            ws.send(JSON.stringify(
                {
                    'event': 'connected',
                    'player': 1,
                    'id': id1
                }
            ));
            sockets[1] = ws;
            console.log('Player 1 connected')
        }
        else if (wss.clients.size === 2) {
            ws.send(JSON.stringify(
                {
                    'event': 'connected',
                    'player': 2,
                    'id': id2
                }
            ));
            sockets[2] = ws;
            console.log('Player 2 connected')
            runGame();
        }
    }
    else {
        ws.send(JSON.stringify({
            'event': 'full'
        }));
        ws.close();
    }

    ws.on('close', function () {
        console.log('Client disconnected')
        ws.isAlive = false;
    });
});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

SquareTypeEnum = {
    REGULAR: 1,
    BASE: 2
}

class SquareState {
    constructor(y, x, count, squareType, unit) {
        this.pos = [y, x];
        this.count = count;
        this.squareType = squareType;
        this.unit = unit;
    }
}

class Unit {
    constructor(playerId) {
        this.playerId = playerId;
    }
}

function runGame() {
    gameStarted = true;
    initState();
    broadcastInit();
    game = setInterval(
        performOneTurn,
        ts
    );
}


function performOneTurn() {
    maybeEndGame();
    requestActions();
    setTimeout(function() {
        updateState();
        broadcastState();
    }, (ts / 2));

}

function maybeEndGame() {
    allDead = true;
    Object.keys(sockets).forEach(function(key) {
        if (sockets[key].isAlive) {
            allDead = false;
        }
    });
    if (allDead){
        console.log('RESTART GAME');
        clearInterval(game);
    }
}

function requestActions() {
    Object.keys(sockets).forEach(function(key) {
        if (sockets[key].isAlive) {
            sockets[key].send(JSON.stringify({'event': 'request_action'}));
        }
        sockets[key].isAlive = false;
    });
}

function broadcastInit() {
    // Things that get broadcast in the beginning of the game
    let playerBases = cache.get('playerBases');
    Object.keys(sockets).forEach(function (key) {
        console.log(playerBases)
        if (sockets[key].isAlive) {
            sockets[key].send(JSON.stringify({'event': 'init', 'base': playerBases[key - 1], 'width': 15, 'height': 15}));
        }
    });
    console.log('Sent init');
}

function broadcastState() {
    Object.keys(sockets).forEach(function (key) {
        if (sockets[key].isAlive){
            sockets[key].send(JSON.stringify({'event': 'update', 'state': getState()}));
        }
    });
    console.log("Sent state");
}


function initState () {
    let squareStates = [];
    let playerBases = [];

    playerBases[0] = [0, 0];
    playerBases[1] = [14, 14];

    for (let i = 0; i < 15; i++) {
        squareStates[i] = [];
        for (let j = 0; j < 15; j++) {
            if (i === playerBases[0][0] && j === playerBases[0][1]) {
                squareStates[i][j] = new SquareState(i, j, 1, SquareTypeEnum.BASE, new Unit(1));
            }
            else if (i === playerBases[1][0] && j === playerBases[1][1]) {
                squareStates[i][j] = new SquareState(i, j, 1, SquareTypeEnum.BASE, new Unit(2));
            }
            else {
                squareStates[i][j] = new SquareState(i, j, 0, SquareTypeEnum.REGULAR, null);
            }
        }
    }

    cache.put('playerBases', playerBases);
    cache.put('squareStates', squareStates);
    cache.put('playerOneMove', null);
    cache.put('playerTwoMove', null);
    console.log('State initialized');
}

function getState() {
    //TODO: logic to decide what to sends over
    const squares = cache.get('squareStates');
    const playerStatus = {};
    Object.entries(sockets).forEach(([id, ws]) => {
        if (ws.isAlive) {
            playerStatus[names[id]] = 'playing';
        }
        else {
            playerStatus[names[id]] = 'disconnected';
        }
    });
    // const flattenedSquares = squares.reduce(function (prev, cur) {
    //     return prev.concat(cur);
    // });

    state = {'squares': squares, 'playerStatus': playerStatus};
    // console.log(state);
    return state
}

function updateState () {
    let squareStates = cache.get('squareStates');
    let playerOneMove = cache.get('playerOneMove') || {};
    let playerTwoMove = cache.get('playerTwoMove') || {};
    // console.log("Current P1 move", playerOneMove);
    // console.log("Current P2 move", playerTwoMove);

    if (playerOneMove.target !== playerTwoMove.target) {
        if (playerOneMove.action && playerOneMove.source && playerOneMove.target) {
            var playerOnePrevSquare = squareStates[playerOneMove.source[0]][playerOneMove.source[1]];
            var playerOneCount = playerOnePrevSquare.count;
            var playerOneUnit = playerOnePrevSquare.unit;

            playerOnePrevSquare.count = 0;
            playerOnePrevSquare.unit = null;
        }
        if (playerTwoMove.action && playerTwoMove.source && playerTwoMove.target) {
            // console.log(playerTwoMove.source);
            var playerTwoPrevSquare = squareStates[playerTwoMove.source[0]][playerTwoMove.source[1]];
            var playerTwoCount = playerTwoPrevSquare.count;
            var playerTwoUnit = playerTwoPrevSquare.unit;

            playerTwoPrevSquare.count = 0;
            playerTwoPrevSquare.unit = null;
        }

        if (playerOneMove.action && playerOneMove.source && playerOneMove.target) {
            let playerOneNextSquare = squareStates[playerOneMove.target[0]][playerOneMove.target[1]];
            playerOneNextSquare.count = playerOneCount;
            playerOneNextSquare.unit = playerOneUnit;
        }
        if (playerTwoMove.action && playerTwoMove.source && playerTwoMove.target) {
            let playerTwoNextSquare = squareStates[playerTwoMove.target[0]][playerTwoMove.target[1]];
            playerTwoNextSquare.count = playerTwoCount;
            playerTwoNextSquare.unit = playerTwoUnit;
        }
    }

    cache.put('squareStates', squareStates);
}
