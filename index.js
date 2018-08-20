var express = require('express');
var cache = require('memory-cache');
var app = express();
var expressWs = require('express-ws')(app);
var path = require('path');
var wss = expressWs.getWss('/');

id1 = 1729;
id2 = 1618;
ts = 1000 / 2;
sockets = {};

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
        let moves = cache.get('moves')
        console.log(msg);

        data = JSON.parse(msg);
        if (data.id === id1) {
            data.player = 1;
            moves.push(data);
        }
        else if (data.id === id2) {
            data.player = 2;
            moves.push(data);
        }
        cache.put('moves', moves);
    });

    if (wss.clients.size === 1) {
        ws.send(JSON.stringify(
            {
                'event': 'connected',
                'player': 1,
                'id': id1
            }
        ));
        ws.id = 1;
        sockets[ws.id] = ws;
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
        ws.id = 2;
        sockets[ws.id] = ws;
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
    constructor(y, x, squareType, unit) {
        this.pos = [y, x];
        this.squareType = squareType;
        this.unit = unit;
    }
}

class SquareCounts {
    constructor(counts) {
        this.counts = counts;
    }

    collapseUnits() {
        let max_idx = -1;
        let max_num = 0;
        let second_max_idx = -1;
        let second_max_num = 0;
        this.counts.forEach(function (count, idx) {
            if (count > max_num) {
                second_max_idx = max_idx;
                second_max_num = max_num;
                max_idx = idx;
                max_num = count;
            }
            else if (count > second_max_num) {
                second_max_idx = idx;
                second_max_num = count;
            }
        })

        if (max_idx === -1 || max_num === second_max_num) {
            for (let idx = 0; idx < this.counts.length; idx++) {
                this.counts[idx] = 0;
            }
        }
        else {
            for (let idx = 0; idx < this.counts.length; idx++) {
                this.counts[idx] = 0;
                if (idx === max_idx) {
                    this.counts[idx] = max_num - second_max_num;
                }
            }
        }
    };

    nonZeroIdx() {
        for (let idx = 0; idx < this.counts.length; idx++) {
            if (this.counts[idx] > 0) {
                return idx;
            }
        }
        return -1;
    }
}

class Unit {
    constructor(playerId, count) {
        this.playerId = playerId;
        this.count = count;
    }
}

function runGame() {
    initState();
    broadcastState();
    broadcastInit();
    setInterval(
        performOneTurn,
        ts
    );
}


function performOneTurn() {
    requestActions();

    setTimeout(function() {
        updateState();
        broadcastState();
    }, (ts / 2));

}

function requestActions() {
    Object.keys(sockets).forEach(function(key) {
        sockets[key].send(JSON.stringify({'event': 'request_action'}));
    });
}

function broadcastInit() {
    // Things that get broadcast in the beginning of the game
    let playerBases = cache.get('playerBases');
    Object.keys(sockets).forEach(function (key) {
        sockets[key].send(JSON.stringify({'event': 'init', 'base': playerBases[key - 1], 'width': 15, 'height': 15}));
    })
}

function broadcastState() {
    Object.keys(sockets).forEach(function (key) {
        sockets[key].send(JSON.stringify({'event': 'update', 'state': getState()}));
    });
    console.log("Sent state");
}


function initState () {
    let squareStates = [];
    let squareCounts = [];
    let playerBases = [];

    playerBases[0] = [0, 0];
    playerBases[1] = [14, 14];

    for (let i = 0; i < 15; i++) {
        squareStates[i] = [];
        squareCounts[i] = [];
        for (let j = 0; j < 15; j++) {
            if (i === playerBases[0][0] && j === playerBases[0][1]) {
                squareStates[i][j] = new SquareState(i, j, SquareTypeEnum.BASE, new Unit(1, 1));
                squareCounts[i][j] = new SquareCounts([1, 0]);
            }
            else if (i === playerBases[1][0] && j === playerBases[1][1]) {
                squareStates[i][j] = new SquareState(i, j, SquareTypeEnum.BASE, new Unit(2, 1));
                squareCounts[i][j] = new SquareCounts([0, 1]);
            }
            else {
                squareStates[i][j] = new SquareState(i, j, SquareTypeEnum.REGULAR, null);
                squareCounts[i][j] = new SquareCounts([0, 0]);
            }
        }
    }

    cache.put('playerBases', playerBases);
    cache.put('squareStates', squareStates);
    cache.put('squareCounts', squareCounts);
    cache.put('moves', []);
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
    let squareCounts = cache.get('squareCounts');
    let moves = cache.get('moves');

    moves.forEach(function (move) {
        let action = move.action;
        let player = move.player - 1;
        if (action && action.action && action.source && action.target) {
            console.log(action);
            squareCounts[action.target[0]][action.target[1]].counts[player] += squareCounts[action.source[0]][action.source[1]].counts[player];
            squareCounts[action.source[0]][action.source[1]].counts[player] = 0;
        }
    })

    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            squareCounts[i][j].collapseUnits();
            let temp_idx = squareCounts[i][j].nonZeroIdx(true);
            if (temp_idx === -1) {
                squareStates[i][j].unit = null;
            }
            else {
                squareStates[i][j].unit = new Unit(temp_idx + 1, squareCounts[i][j].counts[temp_idx]);
            }
        }
    }

    cache.put('squareStates', squareStates);
    cache.put('squareCounts', squareCounts);
    cache.put('moves', []);
}
