let express = require('express');
let cache = require('memory-cache');
let app = express();
let wss = require('express-ws')(app).getWss('/');
let path = require('path');
const {SquareType, AttackerCost} = require('./config');

Vision = {
    UNIT: 1,
    BASE: 3,
    WATCHTOWER: 4,
};

ts = 1000 / 4;
full = false;
gameInterval = null;
heartbeatInterval = null;
maxPlayers = 2;
width = 15;
height = 15;

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
        let data = JSON.parse(msg);
        if (data.event === 'move') {
            console.log('received', data);
            if (data.secret === ws.secret) {
                let queues = cache.get('queues');
                queues[ws.player].push(data.move);
                cache.put('queues', queues);
            }
        }
        else if (data.event === 'reset') {
            console.log(data);
            resetGame();
            runGame();
        }
        else if (data.event === 'exit') {
            console.log(data);
            ws.send(JSON.stringify({'event': 'refresh'}));
            ws.close();
        }
    });

    ws.on('pong', heartbeat);

    ws.on('close', function () {
        console.log('Client disconnected')
    });

    if (!full && (wss.clients.size <= maxPlayers)) {
        ws.ponged = true;
        ws.isAlive = true;
        ws.player = wss.clients.size;
        ws.name = `player_${ws.player}`;
        ws.secret = Math.floor(Math.random() * 10000);

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
        let maxIdx = -1;
        let maxNum = 0;
        let secondMaxIdx = -1;
        let secondMaxNum = 0;
        this.counts.forEach(function (count, idx) {
            if (count > maxNum) {
                secondMaxIdx = maxIdx;
                secondMaxNum = maxNum;
                maxIdx = idx;
                maxNum = count;
            }
            else if (count > secondMaxNum) {
                secondMaxIdx = idx;
                secondMaxNum = count;
            }
        })

        if (maxIdx === -1 || maxNum === secondMaxNum) {
            for (let idx = 0; idx < this.counts.length; idx++) {
                this.counts[idx] = 0;
            }
        }
        else {
            for (let idx = 0; idx < this.counts.length; idx++) {
                this.counts[idx] = 0;
                if (idx === maxIdx) {
                    this.counts[idx] = maxNum - secondMaxNum;
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

function heartbeat() {
    this.ponged = true;
}

function pingPlayers() {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.isAlive = client.ponged;
            client.ping();
            client.ponged = false;
        }
    });
}

function runGame() {
    full = true;
    broadcastStarting();
    initState();
    broadcastInit();
    gameInterval = setInterval(
        performOneTurn,
        ts
    );
    heartbeatInterval = setInterval(
        pingPlayers,
        1000
    );
}


function performOneTurn() {
    resetIfEmpty();
    updateState();
    broadcastState();
}

function resetIfEmpty() {
    if (wss.clients.size === 0) {
        resetGame();
    }
}

function endGame() {
    clearInterval(gameInterval);
    clearInterval(heartbeatInterval);
}

function resetGame() {
    console.log('RESTART GAME');
    endGame();
    setTimeout(function () {
        full = false;
    }, 1000);
}


function broadcastStarting() {
    // Things that get broadcast in the beginning of the game
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({'event': 'starting', 'text': 'Starting game...'}));
        }
    });
    console.log('Sent init');
}

function broadcastInit() {
    // Things that get broadcast in the beginning of the game
    let playerBases = cache.get('playerBases');
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({
                'event': 'init',
                'base': playerBases[client.player - 1],
                'width': width,
                'height': height,
            }));
        }
    });
    console.log('Sent init');
}

function broadcastState() {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({'event': 'update', 'state': getState(client.player)}));
        }
    });
    console.log("Sent state");
}


function initState() {
    let squareStates = [];
    let squareCounts = [];
    let playerBases = [];
    let queues = {};

    let corners = [
        [0, 0],
        [14, 0],
        [0, 14],
        [14, 14]
    ]

    queues[1] = [];
    queues[2] = [];

    let towers = [
        [4, 4],
        [4, 10],
        [10, 4],
        [10, 10]
    ];

    let watchTowers = [
        [7, 7]
    ];

    let rivers = [
        [0, 7],
        [1, 7],
        [2, 7],
        [12, 7],
        [13, 7],
        [14, 7],
        [7, 0],
        [7, 1],
        [7, 2],
        [7, 12],
        [7, 13],
        [7, 14]
    ];

    let randIdxOne = Math.floor(Math.random() * 4);
    let randIdxTwo = Math.floor(Math.random() * 4);
    while(randIdxTwo === randIdxOne) {
        randIdxTwo = Math.floor(Math.random() * 4);
    }
    playerBases[0] = corners[randIdxOne];
    playerBases[1] = corners[randIdxTwo];
    corners.forEach(function(corner, idx) {
        if (idx !== randIdxOne && idx !== randIdxTwo) {
            towers.push(corner);
        }
    });

    for (let i = 0; i < height; i++) {
        squareStates[i] = [];
        squareCounts[i] = [];
        for (let j = 0; j < width; j++) {
            if (i === playerBases[0][0] && j === playerBases[0][1]) {
                squareStates[i][j] = new SquareState(i, j, SquareType.BASE1, null);
                squareCounts[i][j] = new SquareCounts([0, 0]);
            }
            else if (i === playerBases[1][0] && j === playerBases[1][1]) {
                squareStates[i][j] = new SquareState(i, j, SquareType.BASE2, null);
                squareCounts[i][j] = new SquareCounts([0, 0]);
            }
            else {
                squareStates[i][j] = new SquareState(i, j, SquareType.REGULAR, null);
                towers.forEach(function(tower) {
                    if (i === tower[0] && j === tower[1]) {
                        squareStates[i][j] = new SquareState(i, j, SquareType.TOWER, null);
                    }
                })
                watchTowers.forEach(function(tower) {
                    if (i === tower[0] && j === tower[1]) {
                        squareStates[i][j] = new SquareState(i, j, SquareType.WATCHTOWER, null);
                    }
                })
                rivers.forEach(function (river) {
                    if (i === river[0] && j === river[1]) {
                        squareStates[i][j] = new SquareState(i, j, SquareType.RIVER, null);
                    }
                })
                squareCounts[i][j] = new SquareCounts([0, 0]);
            }
        }
    }

    cache.put('playerBases', playerBases);
    cache.put('squareStates', squareStates);
    cache.put('squareCounts', squareCounts);
    cache.put('queues', queues);
    cache.put('shards', [0, 0]);
    cache.put('resourceCenterCounts', [0, 0]);
    cache.put('towers', towers);
    cache.put('gameWonStatus', null);
    console.log('State initialized');
}

function maskForPlayer(squares, playerId) {
    let visible = squares.map(() => () => 0);
    let fill = (y, x, range) => {
        let yMax = Math.min(squares.length, y + range + 1);
        let xMax = Math.min(squares[0].length, x + range + 1);
        for (let iy = Math.max(0, y - range); iy < yMax; iy++) {
            for (let ix = Math.max(0, x - range); ix < xMax; ix++) {
                visible[iy][ix] = true;
            }
        }
    };

    squares.forEach((row, y) => {
        row.forEach((cell, x) => {
            let range;
            if (playerId === 1 && cell.squareType === SquareType.BASE1) {
                range = Vision.BASE;
            } else if (playerId === 2 && cell.squareType === SquareType.BASE2) {
                range = Vision.BASE;
            } else if (cell.squareType === SquareType.WATCHTOWER && cell.unit && cell.unit.playerId === playerId) {
                range = Vision.WATCHTOWER;
            } else if (cell.unit && cell.unit.playerId === playerId) {
                range = Vision.UNIT;
            } else {
                return;
            }
            fill(y, x, range);
        });
    });

    return squares.map((row, y) => (
        row.map((cell, x) => {
            if (visible[y][x]) {
                return cell;
            } else {
                return new SquareState(y, x, SquareType.UNKNOWN, null);
            }
        })
    ));
}

function isInBound(y, x) {
    return (0 <= y && y < height) && (0 <= x && x < width);
}

function isInSpawningRange(y, x, playerId) {
    let squareStates = cache.get('squareStates');
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if ((i !== 0 || j !== 0) && isInBound(y + i, x + j)) {
                if (playerId === 1 && squareStates[y + i][x + j].squareType === SquareType.BASE1) {
                    return true;
                }
                if (playerId === 2 && squareStates[y + i][x + j].squareType === SquareType.BASE2) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getState(playerId) {
    const squares = cache.get('squareStates');
    const gameWonStatus = cache.get('gameWonStatus');
    const shards = cache.get('shards');
    const queues = cache.get('queues');
    const playerStatus = {};
    if (gameWonStatus) {
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                playerStatus[client.player] = {'name': client.name, 'status': gameWonStatus[client.player - 1]};
            }
        });
    }
    else {
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                if (client.isAlive) {
                    playerStatus[client.player] = {'name': client.name, 'status': 'playing'};
                }
                else {
                    playerStatus[client.player] = {'name': client.name, 'status': 'afk'};
                }
            }
        });
    }

    return {queue: queues[playerId], squares: maskForPlayer(squares, playerId), playerStatus: playerStatus, shards: shards[playerId - 1]};
}

function updateState() {
    let squareStates = cache.get('squareStates');
    let squareCounts = cache.get('squareCounts');
    let playerBases = cache.get('playerBases');
    let shards = cache.get('shards');
    let resourceCenterCounts = cache.get('resourceCenterCounts');
    let towers = cache.get('towers');
    let queues = cache.get('queues');
    let moves = [];

    wss.clients.forEach(client => {
        if ((client.readyState === 1) && (queues[client.player].length > 0)) {
            let move = queues[client.player].shift();
            move.player = client.player;
            moves.push(move);
        }
    });

    for (let i = 0; i < shards.length; i++) {
        shards[i] += resourceCenterCounts[i] + 1;
    }

    moves.forEach(function (move) {
        let playerIndex = move.player - 1;

        // Execute the action
        if (move && move.action && move.action.includes('move') && move.source && move.target) {
            let moveIntoBase = (playerBases[playerIndex][0] === move.target[0] && playerBases[playerIndex][1] === move.target[1]);
            let moveIntoRiver = (squareStates[move.target[0]][move.target[1]].squareType === SquareType.RIVER);
            if (!(moveIntoBase || moveIntoRiver)) {
                squareCounts[move.target[0]][move.target[1]].counts[playerIndex] += squareCounts[move.source[0]][move.source[1]].counts[playerIndex];
                squareCounts[move.source[0]][move.source[1]].counts[playerIndex] = 0;
            }
        }
        else if (move && move.action && move.action === 'spawn' && move.target) {
            let [y, x] = move.target;

            if (!squareStates[y][x].unit || squareStates[y][x].unit.playerId !== move.player) {
                squareStates[y][x].unit = new Unit(move.player, 1);
                if (move.player === 1) {
                    squareCounts[y][x] = new SquareCounts([1, 0]);
                }
                else if (move.player === 2) {
                    squareCounts[y][x] = new SquareCounts([0, 1]);
                }
            } else {
                squareStates[y][x].unit.count++;
                squareCounts[y][x].counts[playerIndex]++;
            }
            shards[playerIndex] -= AttackerCost;
        }
    });

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            squareCounts[i][j].collapseUnits();
            let tempIdx = squareCounts[i][j].nonZeroIdx();
            if (tempIdx === -1) {
                squareStates[i][j].unit = null;
            }
            else {
                squareStates[i][j].unit = new Unit(tempIdx + 1, squareCounts[i][j].counts[tempIdx]);
            }
        }
    }

    Object.entries(queues).forEach(([playerId, queue]) => {
        playerId = parseInt(playerId);
        let isPlayer = squareStates.map(row => {
            return row.map(cell => {
                return cell.unit && cell.unit.playerId === playerId;
            });
        });
        let currShards = shards[playerId - 1];

        queues[playerId] = queue.filter(move => {
            if (move.action.includes("move")) {
                let [y, x] = move.source;
                if (isPlayer[y][x]) {
                    isPlayer[y][x] = false;
                    let [newY, newX] = move.target;
                    isPlayer[newY][newX] = true;
                    return true;
                }
                else {
                    console.log("removed move from queue");
                }
            }
            else if (move.action === "spawn") {
                let [y, x] = move.target;
                if (!isInSpawningRange(y, x, playerId)) {
                    return false;
                } else if (currShards - AttackerCost < 0) {
                    return false;
                }
                currShards -= AttackerCost;
                return true;
            }
            return false; // bad queued move
        });
    });


    resourceCenterCounts = new Array(resourceCenterCounts.length).fill(0);
    towers.forEach(function(tower) {
        let ownIdx = squareCounts[tower[0]][tower[1]].nonZeroIdx();
        if (ownIdx !== -1) {
            resourceCenterCounts[ownIdx]++;
        }
    })

    let winPlayerIdx = -1;
    for (let i = 0; i < playerBases.length; i++) {
        let ownIdx = squareCounts[playerBases[i][0]][playerBases[i][1]].nonZeroIdx();
        if (ownIdx !== -1 && ownIdx !== i) {
            winPlayerIdx = ownIdx;
        }
    }
    let gameWonStatus = [];
    if (winPlayerIdx !== -1) {
        for (let i = 0; i < playerBases.length; i++) {
            gameWonStatus[i] = 'lost';
            if (i === winPlayerIdx) {
                gameWonStatus[i] = 'won';
            }
        }
        cache.put('gameWonStatus', gameWonStatus);
        endGame();
    }

    cache.put('squareStates', squareStates);
    cache.put('squareCounts', squareCounts);
    cache.put('shards', shards);
    cache.put('resourceCenterCounts', resourceCenterCounts);
    cache.put('queues', queues);
}
