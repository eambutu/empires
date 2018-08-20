var express = require('express');
var cache = require('memory-cache');

var app = express();
var expressWs = require('express-ws')(app);

var wss = expressWs.getWss('/');

var id1 = null;
var id2 = null;

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
        console.log(`Received ${msg}`);
        ws.send(`Hello, you sent -> ${msg}`);
    });

    if (wss.clients.size == 1) {
        ws.send(`You are Player 1`);
        id1 = ws.id;
    }
    else if (wss.clients.size == 2) {
        ws.send(`You are Player 2`);
        id2 = ws.id;
        runGame();
    }
    else {
        ws.send(`Lobby is full`)
        ws.close();
    }
    console.log('Lobby size is', wss.clients.size);

});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

SquareTypeEnum = {
    REGULAR: 1,
    BASE: 2
}

class SquareState {
    constructor(x, y, count, squareType, unit) {
        this.pos = (x, y);
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
        () => wss.clients.forEach(function (client) {
            client.send(JSON.stringify(getState()));
        }),
        1000
    );
}

function initState () {
    let squareStates = [];
    for (let i = 0; i < 8; i++) {
        squareStates[i] = [];
        for (let j = 0; j < 8; j++) {
            if (i == 0 && j == 0) {
                squareStates[i][j] = new SquareState(i, j, 1, SquareTypeEnum.REGULAR, new Unit(0));
            }
            else if (i == 7 && j == 7) {
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
}

function getState() {
    //TODO: logic to decide what to sends over
    const squares = cache.get('squareStates');
    const flattenedSquares = squares.reduce(function (prev, cur) {
        return prev.concat(cur);
    });

    return flattenedSquares;
}

function updateState () {
    let squareStates = cache.get('squareStates');
    let playerOneMove = cache.get('playerOneMove');
    let playerTwoMove = cache.get('playerTwoMove');
    if (playerOneMove.target !== playerTwoMove.target) {
        let playerOnePrevSquare = squareStates[playerOneMove.source[0]][playerOneMove.source[1]];
        let playerTwoPrevSquare = squareStates[playerTwoMove.source[0]][playerTwoMove.source[1]];
        let playerOneCount = playerOnePrevSquare.count;
        let playerTwoCount = playerTwoPrevSquare.count;
        let playerOneUnit = playerOnePrevSquare.unit;
        let playerTwoUnit = playerTwoPrevSquare.unit;
        playerOnePrevSquare.count = 0;
        playerTwoPrevSquare.count = 0;
        playerOnePrevSquare.unit = null;
        playerTwoPrevSquare.unit = null;

        let playerOneNextSquare = squareStates[playerOneMove.target[0]][playerOneMove.target[1]];
        let playerTwoNextSquare = squareStates[playerTwoMove.target[0]][playerTwoMove.target[1]];
        playerOneNextSquare.count = playerOneCount;
        playerTwoNextSquare.count = playerTwoCount;
        playerOneNextSquare.unit = playerOneUnit;
        playerTwoNextSquare.unit = playerTwoUnit;
    }
    cache.put('squareStates', squareStates);
}
