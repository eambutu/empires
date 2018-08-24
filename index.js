const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const {SquareType, UnitType, Costs, HP} = require('./config');

const _ = require('lodash');

const Vision = {
    UNIT: 1,
    BASE: 3,
    WATCHTOWER: 4,
};

const ts = 1000 / 10;
const framesPerTurn = 2;
const width = 15;
const height = 15;

var rooms = {};

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/room_list', function (req, res) {
    let temp_rooms = _.cloneDeep(rooms);
    Object.keys(temp_rooms).map(function (key) {
        let numPlayers = temp_rooms[key]['clients'].length;
        temp_rooms[key] = _.pick(temp_rooms[key], ['id', 'full', 'gameEnded', 'isTutorial', 'maxPlayers']);
        temp_rooms[key]['numPlayers'] = numPlayers;
    });
    res.send(JSON.stringify(temp_rooms));
})

app.get('/room', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
})

app.get('/room/:roomId', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('/tutorial', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

function initOrGetRoom(roomId, ws, maxPlayers, isTutorial) {
    if (!(roomId in rooms)) {
        rooms[roomId] = {
            id: roomId,
            clients: [],
            full: false,
            gameEnded: false,
            gameInterval: null,
            heartbeatInterval: null,
            frameCounter: 0,
            isTutorial: isTutorial,
            maxPlayers: maxPlayers
        }
    }
    rooms[roomId].clients.push(ws);
    return rooms[roomId];
}

function onConnect(room, ws) {
    if (!room.full && (room.clients.length <= room.maxPlayers)) {
        ws.ponged = true;
        ws.isAlive = true;
        ws.playerId = room.clients.length.toString();
        ws.name = `player_${ws.playerId}`;
        ws.secret = Math.floor(Math.random() * 10000);

        ws.send(JSON.stringify({
            event: 'connected',
            playerId: ws.playerId,
            secret: ws.secret,
            isTutorial: room.isTutorial
        }));
        console.log(`player ${ws.playerId} connected to ${room.id}`);

        if (room.clients.length === room.maxPlayers) {
            room.full = true;
            runGame(room);
        }
    } else {
        ws.send(JSON.stringify({
            event: 'full',
        }));
        ws.close();
    }
}

function onPong(ws) {
    ws.on('pong', () => {
        ws.ponged = true;
    });
}

function onClose(room, ws) {
    ws.on('close', function () {
        room.clients = room.clients.filter(client => (client.readyState === 1));
        if (ws.playerId) {
            console.log(`player ${ws.playerId} disconnected from ${room.id}`);
            room.clients.forEach(client => {
                client.send(JSON.stringify({'event': 'noPlayAgain'}))
            });
        } else {
            console.log(`client attempted connect to ${room.id}`);
        }
    });
}

function onMessage(room, ws) {
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
                    if (data.move.unitId && (data.move.unitId in queues[ws.playerId])) {
                        queues[ws.playerId][data.move.unitId].push(data.move);
                    }
                } else if (data.move.action === "cancelUnitQueue") {
                    queues[ws.playerId][data.move.unitId] = [];
                } else if (data.move.action === "cancelPlayerQueues") {
                    let unitQueues = queues[ws.playerId];
                    Object.keys(unitQueues).forEach(key => {
                        unitQueues[key] = [];
                    });
                }
            }
        } else if (data.event === 'veil') {
            room.isTutorial = false;
        } else if (data.event === 'reset') {
            // console.log(data);
            resetGame(room);
            runGame(room);
        } else if (data.event === 'exit') {
            // console.log(data);
            ws.send(JSON.stringify({'event': 'redirect'}));
            room.clients.forEach(client => {
                client.send(JSON.stringify({'event': 'noPlayAgain'}))
            })
            ws.close();
        }
    });
}

app.ws('/room/:roomId', function (ws, req) {
    let roomId = req.params.roomId;
    let room = initOrGetRoom(roomId, ws, 2, false);

    onConnect(room, ws);
    onMessage(room, ws);
    onPong(ws);
    onClose(room, ws);
});

app.ws('/tutorial', function (ws, req) {
    if (!ws.tutorialRoomId) {
        ws.tutorialRoomId = 'tutorial-'.concat(Math.floor(10000000*Math.random()).toString());
    }
    let room = initOrGetRoom(ws.tutorialRoomId, ws, 1, true);

    onConnect(room, ws);
    onMessage(room, ws);
    onPong(ws);
    onClose(room, ws);
});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

class SquareState {
    constructor(options = {}) {
        Object.assign(this, {
            units: [],
            baseId: null,
            baseHP: 0,
            inFog: false
        }, options);
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
        if (room.isTutorial) {
            delete room;
        } else {
            openRoom(room);
        }
    }
}

function resetGame(room) {
    clearInterval(room.gameInterval);
    clearInterval(room.heartbeatInterval);
    room.gameEnded = false;
}

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
            client.send(JSON.stringify({'event': 'starting'}));
        }
    });
    console.log(`sent starting to ${room.id}`);
}

function broadcastInit(room) {
    // Things that get broadcast in the beginning of the game
    let playerBases = room.playerBases;
    let spawnSquares = room.spawnSquares;
    let playerIds = room.playerIds;
    room.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({
                'event': 'init',
                'playerIds': room.playerIds,
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
    let playerIds = room.clients.map(client => client.playerId);

    if (room.isTutorial) {
        playerIds.push("cpu".toString())
    }

    let playerBases = {};
    let spawnSquares = {};
    let queues = {};
    let trimmed = {};
    let shards = {};

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

    if (room.isTutorial) {
        randIdxOne = 2;
        randIdxTwo = 0;
    } 

    let rand = {
        [playerIds[0]]: randIdxOne,
        [playerIds[1]]: randIdxTwo
    };
    playerIds.forEach(playerId => {
        // Initialize queue
        queues[playerId] = {
            spawn: [],
        };
        trimmed[playerId] = {};
        playerBases[playerId] = corners[rand[playerId]];
        spawnSquares[playerId] = spawnChoices[rand[playerId]];
        shards[playerId] = 23;
    });
    corners.forEach((corner, idx) => {
        if (idx !== randIdxOne && idx !== randIdxTwo) {
            towers.push(corner);
        }
    });

    let squareStates = [...Array(height)].map(y => {
        return [...Array(width)].map(x => {
            return new SquareState({pos: [y, x], type: SquareType.REGULAR});
        });
    });
    Object.entries(playerBases).forEach(([playerId, [y, x]]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.BASE, baseId: playerId, baseHP: 5});
    });
    towers.forEach(([y, x]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.TOWER});
    });
    watchTowers.forEach(([y, x]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.WATCHTOWER});
    });
    rivers.forEach(([y, x]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.RIVER});
    });

    if (room.isTutorial) {
        shards["1"] = 1000;
        queues["1"]["spawn"] = [
            {
                "action": "spawn",
                "target": [1, 13],
                "type": UnitType.ATTACKER,
                "playerId": "1",
            },
            {
                "action": "spawn",
                "target": [0, 11],
                "type": UnitType.DEFENDER,
                "playerId": "1",
            }
        ]
    }

    room.playerIds = playerIds;
    room.playerBases = playerBases;
    room.spawnSquares = spawnSquares;
    room.squareStates = squareStates;
    room.queues = queues;
    room.trimmed = trimmed;
    room.shards = shards;
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
            } else if (cell.type === SquareType.WATCHTOWER || cell.type === SquareType.TOWER) {
                return new SquareState({pos: [y, x], type: cell.type, isFog: true});
            } else if (cell.type === SquareType.BASE) {
                return new SquareState({pos: [y, x], type: SquareType.TOWER, isFog: true});
            } else {
                return new SquareState({pos: [y, x], type: SquareType.UNKNOWN})
            };
        })
    ));
}

function isInSpawningRange(room, y, x, playerId, type) {
    let spawnSquares = room.spawnSquares;
    let squareStates = room.squareStates;
    let isSpawnSquare = (y === spawnSquares[playerId][0] && x === spawnSquares[playerId][1]);
    if (type === UnitType.ATTACKER) {
        return isSpawnSquare;
    } else if (type === UnitType.DEFENDER) {
        // Defender square has to have vision and cannot have existing units on it except defenders of your sort
        // Cannot spawn on enemy base
        // Also, cannot be your own spawn square
        let squareVisions = maskForPlayer(squareStates, playerId);
        let square = squareVisions[y][x];
        if (type === UnitType.DEFENDER && !(square.type === SquareType.UNKNOWN) && !square.isFog &&
            (square.type !== SquareType.BASE || square.baseId === playerId) &&
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
    const trimmed = room.trimmed;
    const playerStatus = {};
    if (gameWonStatus) {
        room.clients.forEach(client => {
            if (client.readyState === 1) {
                playerStatus[client.playerId] = {'name': client.name, 'status': gameWonStatus[client.playerId]};
            }
        });
    } else {
        room.clients.forEach(client => {
            if (client.readyState === 1) {
                if (client.isAlive) {
                    playerStatus[client.playerId] = {'name': client.name, 'status': 'playing'};
                } else {
                    playerStatus[client.playerId] = {'name': client.name, 'status': 'afk'};
                }
            }
        });
    }

    let visibleSquares = squares;
    if (!room.isTutorial) {
        visibleSquares = maskForPlayer(squares, playerId);
    }

    visibleSquares.forEach(row => {
        row.forEach(square => {
            // The client expects the field in terms of "unit"
            square.unit = square.getUnit();
        });
    });

    return {
        queues: queues[playerId],
        trimmed: trimmed[playerId],
        squares: visibleSquares,
        playerStatus: playerStatus,
        shards: shards[playerId]
    };
}

function validateQueues(room) {
    let trimmed = {}
    Object.entries(room.queues).forEach(([playerId, unitQueues]) => {
        [spawnY, spawnX] = room.spawnSquares[playerId];
        trimmed[playerId] = {}
        Object.entries(unitQueues).forEach(([unitId, queue]) => {
            // Don't need to validate spawn queue, because they're always cleared
            if (unitId === "spawn") {
                return;
            }

            let isPlayerAndUnit = room.squareStates.map((row, y) => {
                return row.map((cell, x) => {
                    let unit = cell.getUnit();
                    return (unit && (unit.playerId === playerId) && (unit.id === unitId));
                });
            });

            startingLength = queue.length;
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
            trimmed[playerId][unitId] = (unitQueues[unitId].length !== startingLength);
        });
    });
    room.trimmed = trimmed;
}

function fetchSpawns(room) {
    let spawns = [];
    room.clients.forEach(client => {
        Object.entries(room.queues[client.playerId]).forEach(([unitId, unitQueue]) => {
            if (unitId === "spawn") {
                spawns.push.apply(spawns, unitQueue);
                unitQueue.length = 0;
            }
        });

    });
    return spawns;
}

function addSpawns(room, spawns) {
    spawns.forEach(spawn => {
        let {playerId, target, type} = spawn;
        let [tY, tX] = target;
        if (room.squareStates[tY][tX].type !== SquareType.RIVER && isInSpawningRange(room, tY, tX, playerId, type)) {
            let count = 0;
            if (type === UnitType.ATTACKER) {
                if (Costs.ATTACKER > room.shards[playerId]) {
                    return;
                }
                count = HP.ATTACKER;
                room.shards[playerId] -= Costs.ATTACKER;
            } else if (type === UnitType.DEFENDER) {
                if (Costs.DEFENDER > room.shards[playerId]) {
                    return;
                }
                count = HP.DEFENDER;
                room.shards[playerId] -= Costs.DEFENDER;
            }
            let unitId = Math.floor(10000000*Math.random()).toString();
            room.squareStates[tY][tX].units.push(new Unit(unitId, playerId, type, count));
            room.queues[playerId][unitId] = [];
        }
    });
}

function incrementShards(room) {
    if (room.frameCounter === 0) {
        // increment everyone's shard per turn
        Object.keys(room.shards).forEach((playerId) => {
            room.shards[playerId]++;
        });

        // increment shard if owned tower from previous turn
        room.towers.forEach(([y, x]) => {
            let unit = room.squareStates[y][x].getUnit();
            if (unit) {
                room.shards[unit.playerId]++;
            }
        });
    }
}

function fetchMoves(room) {
    let moves = [];
    room.clients.forEach(client => {
        Object.entries(room.queues[client.playerId]).forEach(([unitId, unitQueue]) => {
            if (unitQueue.length > 0 && (room.frameCounter === 0)) {
                let move = unitQueue.shift();
                moves.push(move);
            }
        });

    });
    return moves;
}

function addMoves(room, moves) {
    // update the units arrays with move
    moves.forEach(move => {
        let {unitId, playerId, target} = move;
        let [sY, sX] = move.source;
        let [tY, tX] = target;

        if (room.squareStates[tY][tX].type !== SquareType.RIVER && !room.squareStates[tY][tX].hasDefenderId(playerId)) {
            let unit = room.squareStates[sY][sX].popUnitById(unitId);
            if (unit) {
                if (unit.playerId !== playerId) {
                    room.squareStates[sY][sX].units.push(unit);
                } else {
                    room.squareStates[tY][tX].units.push(unit);
                }
            }
        }
    });
}

function resolveConflicts(room, moves) {
    room.squareStates.forEach((row) => {
        row.forEach((square) => {
            if (square.units.length > 1) {
                // Gets the total counts for each player
                let playerCounts = {};
                square.units.forEach((unit) => {
                    if (unit.playerId in playerCounts) {
                        playerCounts[unit.playerId] += unit.count;
                    } else {
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
                    } else if (count > secondMaxCount) {
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
                    let numUnitsGoingToMove = 0;
                    let goingToMoveUnit = null;

                    let numUnitsWasMoving = 0;
                    let wasMovingUnit = null;

                    square.units.forEach((unit) => {
                        if (room.queues[unit.playerId][unit.id].length > 0) {
                            numUnitsGoingToMove++;
                            goingToMoveUnit = unit;
                        }
                        moves.forEach(move => {
                            if (move.action.includes("move") && move.unitId === unit.id) {
                                numUnitsWasMoving++;
                                wasMovingUnit = unit;
                            }
                        });
                    });

                    if (numUnitsGoingToMove === 0) {
                        if (numUnitsWasMoving !== 0) {
                            unit = wasMovingUnit;
                        }
                    } else if (numUnitsGoingToMove === 1) {
                        unit = goingToMoveUnit;
                    } else if (numUnitsGoingToMove > 1) {
                        room.queues[unit.playerId][goingToMoveUnit.id].length = 0;
                        unit = goingToMoveUnit;
                    }
                }

                square.units = [new Unit(unit.id, unit.playerId, unit.type, maxCount - secondMaxCount)];

            }
        })
    });
}

function updateBasesAndCheckWin(room) {
    Object.entries(room.playerBases).forEach(([playerId, [y, x]]) => {
        let unit = room.squareStates[y][x].getUnit();
        if (unit && (unit.playerId !== playerId)) {
            if (unit.count >= room.squareStates[y][x].baseHP) {
                let gameWonStatus = {};
                gameWonStatus[playerId] = "lost";
                gameWonStatus[unit.playerId] = "won";
                room.gameWonStatus = gameWonStatus;
                room.gameEnded = true;
            } else {
                room.squareStates[y][x].baseHP -= unit.count;
                room.squareStates[y][x].units.length = 0;
            }
        }
    });
}

function incrementFrameCounter(room) {
    room.frameCounter = (room.frameCounter + 1) % framesPerTurn;
}

function updateState(room) {
    validateQueues(room);

    let spawns = fetchSpawns(room);
    addSpawns(room, spawns);

    let moves = fetchMoves(room);
    addMoves(room, moves);
    resolveConflicts(room, moves);

    validateQueues(room);

    updateBasesAndCheckWin(room);

    incrementShards(room);
    incrementFrameCounter(room);
}
