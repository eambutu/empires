var SquareType = require('./config').SquareType;
var express = require('express');
var cache = require('memory-cache');
var app = express();
var expressWs = require('express-ws')(app);
var path = require('path');
var wss = expressWs.getWss('/');


Vision = {
    UNIT: 1,
    BASE: 3
};

ts = 1000 / 2;
started = false;
gameInterval = null;
maxPlayers = 2;
moves = [];


app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
        ws.isAlive = true;

        let moves = cache.get('moves')
        data = JSON.parse(msg);

        console.log(data);

        if (data.secret === ws.secret) {
            data.player = ws.player;
            moves.push(data);
            console.log('pushed move');
        }
        cache.put('moves', moves);
    });

    if (!started && (wss.clients.size <= maxPlayers)) {
        ws.isAlive = true;
        ws.player = wss.clients.size;
        ws.name = `player_${ws.player}`;
        ws.secret = Math.floor(Math.random() * 10000);;
        ws.send(JSON.stringify(
            {
                'event': 'connected',
                'player': ws.player,
                'secret': ws.secret
            }
        ));
        console.log(`Player ${ws.player} connected`);

        if (wss.clients.size === maxPlayers) {
            runGame();
        }
    }
    else {
        ws.send(JSON.stringify({
            'event': 'full',
            'text': 'Lobby is full'
        }));
        ws.close();
    }

    ws.on('close', function () {
        ws.isAlive = false;
        console.log('Client disconnected')
    });
});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

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
    started = true;
    broadcastStarting();
    initState();
    broadcastInit();
    gameInterval = setInterval(
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
    if (wss.clients.size === 0) {
        console.log('RESTART GAME');
        clearInterval(gameInterval);
        started = false;
    }
}

function requestActions() {
    wss.clients.forEach(client => {
        if (client.isAlive) {
            client.send(JSON.stringify({'event': 'request_action'}));
        }
        client.isAlive = false;
    });
    console.log('Sent request');
}

function broadcastStarting() {
    // Things that get broadcast in the beginning of the game
    wss.clients.forEach(client => {
        if (client.isAlive) {
            client.send(JSON.stringify({'event': 'starting', 'text': 'Starting game...'}));
        }
    });
    console.log('Sent init');
}

function broadcastInit() {
    // Things that get broadcast in the beginning of the game
    let playerBases = cache.get('playerBases');
    wss.clients.forEach(client => {
        if (client.isAlive) {
            client.send(JSON.stringify({'event': 'init', 'base': playerBases[client.player - 1], 'width': 15, 'height': 15}));
        }
    });
    console.log('Sent init');
}

function broadcastState() {
    wss.clients.forEach(client => {
        if (client.isAlive){
            client.send(JSON.stringify({'event': 'update', 'state': getState()}));
        }
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
                squareStates[i][j] = new SquareState(i, j, SquareType.BASE1, new Unit(1, 1));
                squareCounts[i][j] = new SquareCounts([1, 0]);
            }
            else if (i === playerBases[1][0] && j === playerBases[1][1]) {
                squareStates[i][j] = new SquareState(i, j, SquareType.BASE2, new Unit(2, 1));
                squareCounts[i][j] = new SquareCounts([0, 1]);
            }
            else {
                squareStates[i][j] = new SquareState(i, j, SquareType.REGULAR, null);
                squareCounts[i][j] = new SquareCounts([0, 0]);
            }
            console.log(squareStates[i][j]);
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
    const playerStatus = {};
    wss.clients.forEach(client => {
        if (client.isAlive) {
            playerStatus[client.name] = 'playing';
        }
        else {
            playerStatus[client.name] = 'disconnected';
        }
    });
    // const flattenedSquares = squares.reduce(function (prev, cur) {
    //     return prev.concat(cur);
    // });

    state = {'squares': squares, 'playerStatus': playerStatus};
    return state
}

function updateState () {
    let squareStates = cache.get('squareStates');
    let squareCounts = cache.get('squareCounts');
    let moves = cache.get('moves');

    moves.forEach(function (move) {
        let action = move.action;
        let player = move.player - 1;
        if (action && action.action && action.source && action.target) {
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
