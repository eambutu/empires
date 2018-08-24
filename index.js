const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

const {initState, getState, updateState, width, height} = require('./game');

const ts = 1000 / 10;
const framesPerTurn = 2;

var rooms = {};
let queueRooms = {};
let queueRoomId = null;

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/room_list', function (req, res) {
    let temp_rooms = _.cloneDeep(rooms);
    Object.keys(temp_rooms).map(function (key) {
        let numPlayers = temp_rooms[key]['clients'].length;
        temp_rooms[key] = _.pick(temp_rooms[key], ['id', 'full', 'gameEnded', 'isTutorial', 'maxPlayers']);
        temp_rooms[key]['numPlayers'] = numPlayers;
    });
    res.send(JSON.stringify(temp_rooms));
});

app.get(['/room', '/room/:roomId', '/tutorial'], function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

function initOrGetRoom(roomId, rooms, ws, maxPlayers, isTutorial) {
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

const OnConnectStatus = {
    WAITING: 1,
    STARTING: 2,
    EXCLUDED: 3
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
            return OnConnectStatus.STARTING;
        }
        return OnConnectStatus.WAITING;
    } else {
        ws.send(JSON.stringify({
            event: 'full',
        }));
        ws.close();
        return OnConnectStatus.EXCLUDED;
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
            resetGame(room);
            runGame(room);
        } else if (data.event === 'exit') {
            ws.send(JSON.stringify({'event': 'redirect'}));
            room.clients.forEach(client => {
                client.send(JSON.stringify({'event': 'noPlayAgain'}))
            })
            ws.close();
        }
    });
}

app.ws('/queue', function (ws, req) {
    if (!queueRoomId) {
        queueRoomId = crypto.randomBytes(10).toString('hex');
    }
    let queueRoom = initOrGetRoom(queueRoomId, queueRooms, ws, 2, false);
    let onConnectStatus = onConnect(queueRoom, ws);
    if (onConnectStatus !== OnConnectStatus.EXCLUDED) {
        onMessage(queueRoom, ws);
        onPong(ws);
        onClose(queueRoom, ws);
    }
    if (onConnectStatus === OnConnectStatus.STARTING) {
        queueRoomId = null;
        queueRoom.full = true;
        runGame(queueRoom);
    }
});

app.ws('/room/:roomId', function (ws, req) {
    let roomId = req.params.roomId;
    let room = initOrGetRoom(roomId, rooms, ws, 2, false);

    let onConnectStatus = onConnect(room, ws);
    if (onConnectStatus !== OnConnectStatus.EXCLUDED) {
        onMessage(room, ws);
        onPong(ws);
        onClose(room, ws);
    }
    if (onConnectStatus === OnConnectStatus.STARTING) {
        room.full = true;
        runGame(room);
    }
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


getPerformOneTurn = targetRoom => {
    return function performOneTurn() {
        room = targetRoom;
        resetIfEmpty(room);
        if (!room.gameEnded) {
            updateState(room);
            incrementFrameCounter(room);
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
};

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
                'playerIds': playerIds,
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

function incrementFrameCounter(room) {
    room.frameCounter = (room.frameCounter + 1) % framesPerTurn;
}
