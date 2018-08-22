const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const {SquareType, AttackerCost} = require('./config');

const Vision = {
    UNIT: 1,
    BASE: 3,
    WATCHTOWER: 4,
};

const ts = 1000 / 4;
const maxPlayers = 2;
const width = 15;
const height = 15;

var rooms = {};

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/room/:roomId', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

function initOrGetRoom(roomId, ws) {
    if (!(roomId in rooms)) {
        rooms[roomId] = {
            id: roomId,
            clients: [],
            full: false,
            gameEnded: false,
            gameInterval: null,
            heartbeatInterval: null
        }
    }
    rooms[roomId].clients.push(ws);
    return rooms[roomId];
}

function onConnect(room, ws) {
    if (!room.full && (room.clients.length <= maxPlayers)) {
        ws.ponged = true;
        ws.isAlive = true;
        ws.player = room.clients.length;
        ws.name = `player_${ws.player}`;
        ws.secret = Math.floor(Math.random() * 10000);

        ws.send(JSON.stringify({
            event: 'connected',
            player: ws.player,
            secret: ws.secret,
            text: 'Connected! Waiting for other players to join.'
        }));
        console.log(`player ${ws.player} connected to ${room.id}`);

        if (room.clients.length === maxPlayers) {
            room.full = true;
            runGame(room);
        }
    } else {
        ws.send(JSON.stringify({
            event: 'full',
            text: 'Lobby is full'
        }));
        ws.close();
    }
}

app.ws('/room/:roomId', function (ws, req) {
    let roomId = req.params.roomId;
    let room = initOrGetRoom(roomId, ws);

    ws.on('message', function (msg) {
        let data = JSON.parse(msg);
        if (data.event === 'move') {
            // console.log('received', data);
            if (data.secret === ws.secret) {
                let queues = room.queues;
                queues[ws.player].push(data.move);
                room.queues = queues;
            }
        }
        else if (data.event === 'reset') {
            console.log(data);
            endGame(room);
            runGame(room);
        }
        else if (data.event === 'exit') {
            console.log(data);
            ws.send(JSON.stringify({'event': 'refresh'}));
            ws.close();
        }
    });

    ws.on('pong', () => {
        ws.ponged = true;
    });

    ws.on('close', function () {
        room.clients = room.clients.filter(client => (client.readyState === 1));
        if (ws.player) {
            console.log(`player ${ws.player} disconnected from ${room.id}`);
        }
        else {
            console.log(`client attempted connect to ${room.id}`);
        }
    });
    onConnect(room, ws);
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

getPerformOneTurn = targetRoom => {
    return function performOneTurn() {
        room = targetRoom;
        resetIfEmpty(room);
        if (!room.gameEnded) {
            updateState(room);
            broadcastState(room);
        }
    };    
};

getPingPlayers = targetRoom => {
    return function pingPlayers() {
        room = targetRoom;
        room.clients.forEach(client => {
            if (client.readyState === 1) {
                client.isAlive = client.ponged;
                client.ping();
                client.ponged = false;
            }
        });
    }    
}

function runGame(room) {
    room.gameEnded = false;
    broadcastStarting(room);
    initState(room);
    broadcastInit(room);
    room.gameInterval = setInterval(
        getPerformOneTurn(room),
        ts
    );
    room.heartbeatInterval = setInterval(
        getPingPlayers(room),
        1000
    );
}

function resetIfEmpty(room) {
    room.clients = room.clients.filter(client => (client.readyState === 1));
    if (room.clients.length === 0) {
        resetGame(room);
    }
}

function endGame(room) {
    clearInterval(room.gameInterval);
    clearInterval(room.heartbeatInterval);
}

// getSetRoomNotFull = targetRoom => function () {
//     room = targetRoom;
//     room.full = false;
// };

function resetGame(room) {
    console.log('RESTART GAME');
    endGame(room);
    setTimeout(
        function () {room.full = false;},
        1000
    );
}


function broadcastStarting(room) {
    room.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({'event': 'starting', 'text': 'Starting game...'}));
        }
    });
    console.log(`sent starting to ${room.id}`);
}

function broadcastInit(room) {
    // Things that get broadcast in the beginning of the game
    let playerBases = room.playerBases;
    room.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({
                'event': 'init',
                'base': playerBases[client.player - 1],
                'width': width,
                'height': height,
            }));
        }
    });
    console.log(`sent init to ${room.id}`);
}

function broadcastState(room) {
    room.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({'event': 'update', 'state': getState(room, client.player)}));
        }
    });
    // console.log("Sent state");
}


function initState(room) {
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
                let squareState = new SquareState(i, j, SquareType.BASE, null);
                squareState.playerId = 1;
                squareStates[i][j] = squareState;
                squareCounts[i][j] = new SquareCounts([0, 0]);
            }
            else if (i === playerBases[1][0] && j === playerBases[1][1]) {
                let squareState = new SquareState(i, j, SquareType.BASE, null);
                squareState.playerId = 2;
                squareStates[i][j] = squareState;
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

    room.playerBases = playerBases;
    room.squareStates = squareStates;
    room.squareCounts = squareCounts;
    room.queues = queues;
    room.shards = [0, 0];
    room.resourceCenterCounts = [0, 0];
    room.towers = towers;
    room.gameWonStatus = null;
    console.log(`state initialized for ${room.id}`);
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
            if (cell.squareType === SquareType.BASE && playerId === cell.playerId) {
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

function isInSpawningRange(room, y, x, playerId) {
    let squareStates = room.squareStates;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if ((i !== 0 || j !== 0) && isInBound(y + i, x + j)) {
                let square = squareStates[y + i][x + j];
                if (square.squareType === SquareType.BASE && playerId === square.playerId) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getState(room, playerId) {
    const squares = room.squareStates;
    const gameWonStatus = room.gameWonStatus;
    const shards = room.shards;
    const queues = room.queues;
    const playerStatus = {};
    if (gameWonStatus) {
        room.clients.forEach(client => {
            if (client.readyState === 1) {
                playerStatus[client.player] = {'name': client.name, 'status': gameWonStatus[client.player - 1]};
            }
        });
    }
    else {
        room.clients.forEach(client => {
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

function updateState(room) {
    let squareStates = room.squareStates;
    let squareCounts = room.squareCounts;
    let playerBases = room.playerBases;
    let shards = room.shards;
    let resourceCenterCounts = room.resourceCenterCounts;
    let towers = room.towers;
    let queues = room.queues;
    let moves = [];

    room.clients.forEach(client => {
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
            }
            else if (move.action === "spawn") {
                let [y, x] = move.target;
                if (!isInSpawningRange(room, y, x, playerId)) {
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
        room.gameWonStatus = gameWonStatus;
        room.gameEnded = true;
    }

    room.squareStates = squareStates;
    room.squareCounts = squareCounts;
    room.shards = shards;
    room.resourceCenterCounts = resourceCenterCounts;
    room.queues = queues;
}
