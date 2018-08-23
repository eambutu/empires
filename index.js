const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const {SquareType, UnitType, Costs} = require('./config');

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
    constructor(y, x, squareType, unit, baseId) {
        this.pos = [y, x];
        this.squareType = squareType;
        this.unit = unit;
        this.baseId = baseId;
    }
}

class SquareCount {
    constructor(counts, type) {
        this.counts = counts;
        this.type = type
    }
}

function compareSquareCounts(squareCount1, squareCount2) {
    return squareCount1.counts - squareCount2.counts;
}

class Unit {
    constructor(playerId, type, count) {
        this.playerId = playerId;
        this.type = type;
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
            let squareCounts = room.squareCounts;
        }
    });
    // console.log("Sent state");
}


function initState(room) {
    let squareStates = [];
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
        [10, 1]
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
        for (let j = 0; j < width; j++) {
            if (i === playerBases[0][0] && j === playerBases[0][1]) {
                let squareState = new SquareState(i, j, SquareType.BASE, null, 1);
                squareStates[i][j] = squareState;
            }
            else if (i === playerBases[1][0] && j === playerBases[1][1]) {
                let squareState = new SquareState(i, j, SquareType.BASE, null, 2);
                squareStates[i][j] = squareState;
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
            }
        }
    }
    let squareCounts = squareStates.map(row => row.map(cell => {
        // if you do this with Array fill, the whole array will refer to the same object
        // (dont spend 30 minutes debugging this like me)
        let counts = [];
        for (let idx = 0; idx < maxPlayers; idx++) {
            counts[idx] = new SquareCount(0, null);
        }
        if (cell.unit) {
            let {playerId, type, count} = cell.unit;
            counts[playerId - 1] = SquareCount(count, type);
        }
        return counts;
    }));

    room.playerBases = playerBases;
    room.squareStates = squareStates;
    room.squareCounts = squareCounts;
    room.queues = queues;
    room.shards = [23, 23];
    room.towers = towers;
    room.gameWonStatus = null;
    room.lastPlayerMoves = Array(maxPlayers).fill(null);
    console.log(`state initialized for ${room.id}`);
}

function maskForPlayer(squares, playerId) {
    let visible = squares.map(() => () => 0);
    let fill = (y, x, range) => {
        let yMax = Math.min(height, y + range + 1);
        let xMax = Math.min(width, x + range + 1);
        for (let iy = Math.max(0, y - range); iy < yMax; iy++) {
            for (let ix = Math.max(0, x - range); ix < xMax; ix++) {
                visible[iy][ix] = true;
            }
        }
    };

    squares.forEach((row, y) => {
        row.forEach((cell, x) => {
            let range;
            if (cell.squareType === SquareType.BASE && playerId === cell.baseId) {
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

function isInSpawningRange(room, y, x, playerId, type) {
    let squareStates = room.squareStates;
    let squareVisions = maskForPlayer(squareStates, playerId);
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if ((i !== 0 || j !== 0) && isInBound(y + i, x + j)) {
                let square = squareStates[y + i][x + j];
                let squareVision = squareVisions[y + i][x + j];
                if (type === UnitType.ATTACKER && square.squareType === SquareType.BASE && playerId === square.baseId) {
                    return true;
                }
                // Defender square has to have vision and cannot have existing units on it except defenders of your sort
                if (type === UnitType.DEFENDER && !(squareVision.type === SquareType.UNKNOWN) &&
                    (!square.unit || (playerId === square.unit.playerId && square.unit.type === UnitType.DEFENDER))) {
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

    return {
        queue: queues[playerId],
        squares: maskForPlayer(squares, playerId),
        playerStatus: playerStatus,
        shards: shards[playerId - 1],
        lastMove: room.lastPlayerMoves[playerId - 1]
    };
}

function updateState(room) {
    let squareStates = room.squareStates;
    let squareCounts = room.squareCounts;
    let playerBases = room.playerBases;
    let shards = room.shards;
    let towers = room.towers;
    let queues = room.queues;
    let lastPlayerMoves = room.lastPlayerMoves;

    let moves = [];
    room.clients.forEach(client => {
        if ((client.readyState === 1) && (queues[client.player].length > 0)) {
            let move = queues[client.player].shift();
            move.player = client.player;
            moves.push(move);
        }
    });
    
    // increment everyone's shard per turn
    for (let i = 0; i < shards.length; i++) {
        shards[i]++;
    }

    // increment shard if owned tower from previous turn
    towers.forEach(([y, x]) => {
        let unit = squareStates[y][x].unit;
        if (unit) {
            shards[parseInt(unit.playerId) - 1]++;
        }
    });

    // update the counts with the moves
    moves.forEach(move => {
        let {action, player, target, type} = move;
        let playerIndex = player - 1;
        let [tY, tX] = target;
        if (squareStates[tY][tX].squareType !== SquareType.RIVER) {
            if (action.includes("move")) {
                let [sY, sX] = move.source;
                squareCounts[tY][tX][playerIndex].counts += squareCounts[sY][sX][playerIndex].counts;
                squareCounts[sY][sX][playerIndex].counts = 0;
            } else if (action === "spawn") {
                console.log(moves);
                let [tY, tX] = target;
                if (type === UnitType.ATTACKER) {
                    squareCounts[tY][tX][playerIndex].counts++;
                    squareCounts[tY][tX][playerIndex].type = UnitType.ATTACKER;
                    shards[playerIndex] -= Costs.ATTACKER;
                }
                else if (type === UnitType.DEFENDER) {
                    squareCounts[tY][tX][playerIndex].counts += 10;
                    squareCounts[tY][tX][playerIndex].type = UnitType.DEFENDER;
                    shards[playerIndex] -= Costs.DEFENDER;
                }
            }
        }
        lastPlayerMoves[playerIndex] = move;
    });

    let comp = ([_1, count1], [_2, count2]) => (compareSquareCounts(count1, count2));
    // update squareStates with squareCounts
    squareCounts.forEach((row, y) => {
        row.forEach((counts, x) => {
            let countTuples = counts.map((count, index) => [index, count]);
            countTuples = countTuples.sort(comp).reverse(); // sort largest to smallest
            let [bestPlayerIndex, firstCount] = countTuples[0];
            let bestPlayerId = bestPlayerIndex + 1;
            let secondCount = countTuples[1][1];
            let finalCount = firstCount.counts - secondCount.counts;
            // don't use fill here, because array fill doesnt work well with objects
            for (let idx = 0; idx < maxPlayers; idx++) {
                squareCounts[y][x][idx] = new SquareCount(0, null)
            }
            if (finalCount > 0) {
                squareStates[y][x].unit = new Unit(bestPlayerId, firstCount.type, finalCount);
                squareCounts[y][x][bestPlayerIndex] = new SquareCount(finalCount, firstCount.type);
            } else {
                squareStates[y][x].unit = null;
            }
        });
    });

    console.log(squareCounts[1][0]);

    Object.entries(queues).forEach(([playerIdStr, queue]) => {
        let playerId = parseInt(playerIdStr);
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
                if (!isInSpawningRange(room, y, x, playerId, move.type)) {
                    return false;
                } else if (move.type === UnitType.ATTACKER && currShards - Costs.ATTACKER < 0) {
                    return false;
                } else if (move.type === UnitType.DEFENDER && currShards - Costs.DEFENDER < 0) {
                    return false;
                }
                isPlayer[y][x] = true;
                return true;
            }
            return false; // bad queued move
        });
    });

    playerBases.forEach(([y, x], playerIndex) => {
        let unit = squareStates[y][x].unit;
        if (unit && (unit.playerId !== playerIndex + 1)) {
            let gameWonStatus = [null, null];
            gameWonStatus[playerIndex] = "lost";
            gameWonStatus[unit.playerId - 1] = "won";
            room.gameWonStatus = gameWonStatus;
            room.gameEnded = true;
        }
    });
}
