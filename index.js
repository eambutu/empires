var express = require('express');
var cache = require('memory-cache');
var app = express();
var expressWs = require('express-ws')(app);
var wss = expressWs.getWss('/');

id1 = null;
id2 = null;

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
        console.log(msg);

        data = JSON.parse(msg);
        if (data.player === "1") {
            cache.put('playerOneMove', data.action);
        }
        else if (data.player === "2") {
            cache.put('playerTwoMove', data.action);
        }
    });

    if (wss.clients.size == 1) {
        ws.send('Player 1');
        console.log('Player 1 connected')
    }
    else if (wss.clients.size == 2) {
        ws.send('Player 2');
        console.log('Player 2 connected')
        runGame();
    }
    else {
        ws.send(`Lobby is full`)
        ws.close();
    }

    ws.on('close', function () {
        console.log('Client disconnected')
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
    initState();
    setInterval(
        performOneTurn,
        1000 / 60
    );
}


function performOneTurn() {
    requestActions();
    updateState();
    broadcastState();
}

function requestActions() {
    wss.clients.forEach(function (client) {
        client.send('give me action');
    });
}

function broadcastState() {
    wss.clients.forEach(function (client) {
        client.send(JSON.stringify(getState()));
    });
    console.log("Sent state");
}


function initState () {
    let squareStates = [];
    for (let i = 0; i < 4; i++) {
        squareStates[i] = [];
        for (let j = 0; j < 4; j++) {
            if (i === 0 && j === 0) {
                squareStates[i][j] = new SquareState(i, j, 1, SquareTypeEnum.REGULAR, new Unit(0));
            }
            else if (i === 3 && j === 3) {
                squareStates[i][j] = new SquareState(i, j, 1, SquareTypeEnum.REGULAR, new Unit(1));
            }
            else {
                squareStates[i][j] = new SquareState(i, j, 0, SquareTypeEnum.REGULAR, null);
            }
        }
    }
    cache.put('squareStates', squareStates);
    cache.put('playerOneMove', null);
    cache.put('playerTwoMove', null);
    console.log('State initialized');
}

function getState() {
    //TODO: logic to decide what to sends over
    const squares = cache.get('squareStates');
    // const flattenedSquares = squares.reduce(function (prev, cur) {
    //     return prev.concat(cur);
    // });

    return squares;
}

function updateState () {
    let squareStates = cache.get('squareStates');
    let playerOneMove = cache.get('playerOneMove') || {};
    let playerTwoMove = cache.get('playerTwoMove') || {};
    console.log("Current P1 move", playerOneMove);
    console.log("Current P2 move", playerTwoMove);

    if (playerOneMove.target !== playerTwoMove.target) {
        if (playerOneMove.action && playerOneMove.source && playerOneMove.target) {
            var playerOnePrevSquare = squareStates[playerOneMove.source[0]][playerOneMove.source[1]];
            var playerOneCount = playerOnePrevSquare.count;
            var playerOneUnit = playerOnePrevSquare.unit;

            playerOnePrevSquare.count = 0;
            playerOnePrevSquare.unit = null;
        }
        if (playerTwoMove.action && playerTwoMove.source && playerTwoMove.target) {
            console.log(playerTwoMove.source);
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
