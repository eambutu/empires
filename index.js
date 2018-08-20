var express = require('express');
var cache = require('memory_cache');

var app = express();
app.get('/', function (req, res) {
    res.send('Hello World!');
});
app.listen(5000, function () {
    console.log('App listening on port 3000!');
});

SquareTypeEnum = {
    REGULAR: 1,
    BASE: 2
}

class SquareState {
    constructor(x, y, count, squareType, occupied) {
        this.pos = (x, y);
        this.count = count;
        this.squareType = squareType;
        this.occupied = occupied;
    }
}

class Unit {
    constructor(playerId) {
        this.playerId = playerId;
    }
}

function initState () {
    var squareStates = [];
    for (var i = 0; i < 8; i++) {
        squareStates[i] = [];
        for (var j = 0; j < 8; j++) {
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

function sendState () {
    //TODO: logic to decide what to sends over
    const squares = cache.get('squareStates');
    const flattenedSquares = squares.reduce(function(prev, cur) {
        return prev.concat(cur);
    });
    res.send(JSON.stringify(flattenedSquares));
}

function updateState () {

}