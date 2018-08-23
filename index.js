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

const ts = 1000 / 8;
const framesPerTurn = 4;
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
            heartbeatInterval: null,
            frameCounter: 0
        }
    }
    rooms[roomId].clients.push(ws);
    return rooms[roomId];
}

function onConnect(room, ws) {
    if (!room.full && (room.clients.length <= maxPlayers)) {
        ws.ponged = true;
        ws.isAlive = true;
        ws.playerId = room.clients.length.toString();
        ws.name = `player_${ws.playerId}`;
        ws.secret = Math.floor(Math.random() * 10000);

        ws.send(JSON.stringify({
            event: 'connected',
            playerId: ws.playerId,
            secret: ws.secret,
            text: 'Connected! Waiting for other players to join.'
        }));
        console.log(`player ${ws.playerId} connected to ${room.id}`);

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
                data.move.playerId = ws.playerId;
                if (data.move.action === "spawn") {
                    queues[ws.playerId]["spawn"].push(data.move);
                } else if (data.move.action.includes("move")) {
                    if (data.move.unitId) {
                        queues[ws.playerId][data.move.unitId].push(data.move);
                    }
                } else if (data.move.action === "cancelQueue") {
                    let playerQueues = queues[ws.playerId];
                    Object.keys(playerQueues).forEach(key => {
                        playerQueues[key] = [];
                    });
                }
            }
        }
        else if (data.event === 'reset') {
            // console.log(data);
            resetGame(room);
            runGame(room);
        }
        else if (data.event === 'exit') {
            // console.log(data);
            ws.send(JSON.stringify({'event': 'redirect'}));
            room.clients.forEach(client => {
                client.send(JSON.stringify({'event': 'noPlayAgain'}))
            })
            ws.close();
        }
    });

    ws.on('pong', () => {
        ws.ponged = true;
    });

    ws.on('close', function () {
        room.clients = room.clients.filter(client => (client.readyState === 1));
        if (ws.playerId) {
            console.log(`player ${ws.playerId} disconnected from ${room.id}`);
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
    constructor(y, x, type, units, baseId, baseHP) {
        this.pos = [y, x];
        this.type = type;
        this.units = units;
        this.baseId = baseId;
        this.baseHP = baseHP
    }

    currentOwner() {
        // function assumes that only units of one player are on the square
        if (this.units.length === 0) {
            return null;
        }
        return this.units[0].playerId;
    }

    getUnit() {
        // function assumes only one unit is in the units array
        return this.units.length > 0 ? this.units[0] : null;
    }

    popUnitById(id) {
        for (let idx = 0; idx < this.units.length; idx++) {
            if (this.units[idx].id === id) {
                let temp = this.units[idx];
                this.units.splice(idx, 1);
                return temp;
            }
        }
        return null;
    }

    hasDefenderId(playerId) {
        for (let idx = 0; idx < this.units.length; idx++) {
            if (this.units[idx].playerId === playerId) {
                return this.units[idx].type === UnitType.DEFENDER;
            }
        }
        return false;
    }
}

class Unit {
    constructor(id, playerId, type, count) {
        this.id = id;
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
                client.ponged = false;
                client.ping();
            }
        });
    }    
}

function runGame(room) {
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
        openRoom(room);
    }
}

function resetGame(room) {
    clearInterval(room.gameInterval);
    clearInterval(room.heartbeatInterval);
    room.gameEnded = false;
}

// getSetRoomNotFull = targetRoom => function () {
//     room = targetRoom;
//     room.full = false;
// };

function openRoom(room) {
    console.log('RESTART GAME');
    resetGame(room);
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
    let spawnSquares = room.spawnSquares;
    room.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({
                'event': 'init',
                'base': playerBases[client.playerId],
                'spawn': spawnSquares[client.playerId],
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
            client.send(JSON.stringify({'event': 'update', 'state': getState(room, client.playerId)}));
        }
    });
    // console.log("Sent state");
}


function initState(room) {
    let squareStates = [];
    let playerBases = {};
    let spawnSquares = {};
    let queues = {};

    let corners = [
        [0, 0],
        [14, 0],
        [0, 14],
        [14, 14]
    ];

    let spawnChoices = [
        [1, 1],
        [13, 1],
        [1, 13],
        [13, 13]
    ];

    queues[room.clients[0].playerId] = {'spawn': []};
    queues[room.clients[1].playerId] = {'spawn': []};

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
    playerBases[room.clients[0].playerId] = corners[randIdxOne];
    playerBases[room.clients[1].playerId] = corners[randIdxTwo];
    spawnSquares[room.clients[0].playerId] = spawnChoices[randIdxOne];
    spawnSquares[room.clients[1].playerId] = spawnChoices[randIdxTwo];
    corners.forEach(function(corner, idx) {
        if (idx !== randIdxOne && idx !== randIdxTwo) {
            towers.push(corner);
        }
    });

    for (let i = 0; i < height; i++) {
        squareStates[i] = [];
        for (let j = 0; j < width; j++) {
            if (i === playerBases[room.clients[0].playerId][0] && j === playerBases[room.clients[0].playerId][1]) {
                let squareState = new SquareState(i, j, SquareType.BASE, [], room.clients[0].playerId, 5);
                squareStates[i][j] = squareState;
            }
            else if (i === playerBases[room.clients[1].playerId][0] && j === playerBases[room.clients[1].playerId][1]) {
                let squareState = new SquareState(i, j, SquareType.BASE, [], room.clients[1].playerId, 5);
                squareStates[i][j] = squareState;
            }
            else {
                squareStates[i][j] = new SquareState(i, j, SquareType.REGULAR, [], null, 0);
                towers.forEach(function(tower) {
                    if (i === tower[0] && j === tower[1]) {
                        squareStates[i][j] = new SquareState(i, j, SquareType.TOWER, [], null, 0);
                    }
                })
                watchTowers.forEach(function(tower) {
                    if (i === tower[0] && j === tower[1]) {
                        squareStates[i][j] = new SquareState(i, j, SquareType.WATCHTOWER, [], null, 0);
                    }
                })
                rivers.forEach(function (river) {
                    if (i === river[0] && j === river[1]) {
                        squareStates[i][j] = new SquareState(i, j, SquareType.RIVER, [], null, 0);
                    }
                })
            }
        }
    }

    room.playerBases = playerBases;
    room.spawnSquares = spawnSquares;
    room.squareStates = squareStates;
    room.queues = queues;
    room.shards = {
        [room.clients[0].playerId]: 23,
        [room.clients[1].playerId]: 23
    };
    room.towers = towers;
    room.gameWonStatus = null;
    room.frameCounter = 0;
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
            if (cell.type === SquareType.BASE && playerId === cell.baseId) {
                range = Vision.BASE;
            } else if (cell.type === SquareType.WATCHTOWER && cell.currentOwner() === playerId) {
                range = Vision.WATCHTOWER;
            } else if (cell.currentOwner() && cell.currentOwner() === playerId) {
                range = Vision.UNIT;
            } else {
                if (cell.type === SquareType.RIVER) {
                    visible[y][x] = true;
                }
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
                return new SquareState(y, x, SquareType.UNKNOWN, [], null, 0);
            }
        })
    ));
}

function isInSpawningRange(room, y, x, playerId, type) {
    let spawnSquares = room.spawnSquares;
    let squareStates = room.squareStates;
    let isSpawnSquare = (y === spawnSquares[playerId][0] && x === spawnSquares[playerId][1]);
    if (type === UnitType.ATTACKER) {
        return isSpawnSquare;
    }
    else if (type === UnitType.DEFENDER) {
        // Defender square has to have vision and cannot have existing units on it except defenders of your sort
        // Also, cannot be your own spawn square
        let squareVisions = maskForPlayer(squareStates, playerId);
        let square = squareVisions[y][x];
        if (type === UnitType.DEFENDER && !(square.type === SquareType.UNKNOWN) &&
            (!square.getUnit() || (playerId === square.currentOwner() && square.getUnit().type === UnitType.DEFENDER)) &&
            !isSpawnSquare) {
            return true;
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
                playerStatus[client.playerId] = {'name': client.name, 'status': gameWonStatus[client.playerId]};
            }
        });
    }
    else {
        room.clients.forEach(client => {
            if (client.readyState === 1) {
                if (client.isAlive) {
                    playerStatus[client.playerId] = {'name': client.name, 'status': 'playing'};
                }
                else {
                    playerStatus[client.playerId] = {'name': client.name, 'status': 'afk'};
                }
            }
        });
    }

    let maskedSquares = maskForPlayer(squares, playerId);
    maskedSquares.forEach(row => {
        row.forEach(square => {
            // The client expects the field in terms of "unit"
            square.unit = square.getUnit();
        });
    });

    return {
        queues: queues[playerId],
        squares: maskedSquares,
        playerStatus: playerStatus,
        shards: shards[playerId],
    };
}

function validateQueues(room) {
    let queues = room.queues;
    let squareStates = room.squareStates;
    Object.entries(queues).forEach(([playerId, unitQueues]) => {
        Object.entries(unitQueues).forEach(([unitId, queue]) => {
            // Don't need to clear shard queue, because they're always cleared
            if (unitId === "spawn") {
                return;
            }

            let isPlayerAndUnit = squareStates.map(row => {
                return row.map(cell => {
                    let unit = cell.getUnit();
                    return unit && (unit.playerId === playerId) && (unit.id === unitId);
                });
            });

            unitQueues[unitId] = queue.filter(move => {
                if (move.action.includes("move")) {
                    let [y, x] = move.source;
                    if (isPlayerAndUnit[y][x]) {
                        isPlayerAndUnit[y][x] = false;
                        let [newY, newX] = move.target;
                        isPlayerAndUnit[newY][newX] = true;
                        return true;
                    }
                }

                return false;
            });
        });
    });
}

function updateState(room) {
    let squareStates = room.squareStates;
    let playerBases = room.playerBases;
    let shards = room.shards;
    let towers = room.towers;
    let queues = room.queues;
    let frameCounter = room.frameCounter;

    let spawns = [];
    let moves = [];

    validateQueues(room);
    room.clients.forEach(client => {
        Object.entries(queues[client.playerId]).forEach(([unitId, unitQueue]) => {
            if (unitId === 'spawn') {
                spawns.push.apply(spawns, unitQueue);
                unitQueue.length = 0;
            }
            else if (unitQueue.length > 0 && (frameCounter === 0)) {
                let move = unitQueue.shift();
                moves.push(move);
            }
        });

    });
    
    // increment everyone's shard per turn
    Object.keys(shards).forEach((playerId) => {
        shards[playerId]++;
    });

    // increment shard if owned tower from previous turn
    towers.forEach(([y, x]) => {
        let unit = squareStates[y][x].getUnit();
        if (unit) {
            shards[unit.playerId]++;
        }
    });

    spawns.forEach(spawn => {
        let {playerId, target, type} = spawn;
        let [tY, tX] = target;
        if (squareStates[tY][tX].type !== SquareType.RIVER && isInSpawningRange(room, tY, tX, playerId, type)) {
            let count = 0;
            if (type === UnitType.ATTACKER) {
                count = 1;
                shards[playerId] -= Costs.ATTACKER;
            }
            else if (type === UnitType.DEFENDER) {
                count = 10;
                shards[playerId] -= Costs.DEFENDER;
            }
            let unitId = Math.floor(10000000*Math.random()).toString();
            squareStates[tY][tX].units.push(new Unit(unitId, playerId, type, count));
            queues[playerId][unitId] = [];
        }
    });

    // update the units arrays with move
    moves.forEach(move => {
        let {unitId, playerId, target} = move;
        let [sY, sX] = move.source;
        let [tY, tX] = target;
        if (squareStates[tY][tX].type !== SquareType.RIVER && !squareStates[tY][tX].hasDefenderId(playerId)) {
            let unit = squareStates[sY][sX].popUnitById(unitId);
            if (unit) {
                if (unit.playerId !== playerId) {
                    squareStates[sY][sX].units.push(unit);
                }
                else {
                    squareStates[tY][tX].units.push(unit);
                }
            }
        }
    });


    squareStates.forEach((row) => {
        row.forEach((square) => {
            if (square.units.length > 1) {
                // Gets the total counts for each player
                let playerCounts = {};
                square.units.forEach((unit) => {
                    if (unit.playerId in playerCounts) {
                        playerCounts[unit.playerId] += unit.count;
                    }
                    else {
                        playerCounts[unit.playerId] = unit.count;
                    }
                });
                // Finds player ID of winning player
                let maxCount = 0;
                let maxPlayerId = 0;
                let secondMaxCount = 0;
                Object.entries(playerCounts).forEach(([playerId, count]) => {
                    if (count > maxCount) {
                        maxPlayerId = playerId;
                        secondMaxCount = maxCount;
                        maxCount = count;
                    }
                    else if (count > secondMaxCount) {
                        secondMaxCount = count;
                    }
                });
                // If equal number of units, remove everything and return
                if (maxCount === secondMaxCount) {
                    square.units = [];
                    return;
                }
                // Removes units that are not from wining player
                square.units = square.units.filter(unit => {
                    return unit.playerId === maxPlayerId;
                });
                // Merge winning player's
                let unit = square.getUnit();
                if (square.units.length > 1) {
                    let numUnitsMoving = 0;
                    let movingUnit = null;
                    let wasMovingUnit = null;

                    square.units.forEach((unit) =>{
                        if (queues[unit.playerId][unit.id].length > 0) {
                            numUnitsMoving++;
                            movingUnit = unit;
                        }
                        moves.forEach(move => {
                            if (move.action.includes("move") && move.unitId === unit.id) {
                                wasMovingUnit = unit;
                            }
                        });
                    });

                    if (numUnitsMoving === 1) {
                        unit = movingUnit;
                    }
                    else if (numUnitsMoving > 1) {
                        queues[unit.playerId][movingUnit.id].length = 0;
                        unit = movingUnit;
                    }
                }

                square.units = [new Unit(unit.id, unit.playerId, unit.type, maxCount - secondMaxCount)];

            }
        })
    });

    validateQueues(room);

    Object.entries(playerBases).forEach(([playerId, [y, x]]) => {
        let unit = squareStates[y][x].getUnit();
        if (unit && (unit.playerId !== playerId)) {
            if (unit.count >= squareStates[y][x].baseHP) {
                let gameWonStatus = {};
                gameWonStatus[playerId] = "lost";
                gameWonStatus[unit.playerId] = "won";
                room.gameWonStatus = gameWonStatus;
                room.gameEnded = true;
            }
            else {
                squareStates[y][x].baseHP -= unit.count;
                squareStates[y][x].units.length = 0;
            }
        }
    });

    room.frameCounter = (frameCounter + 1) % framesPerTurn;
}
