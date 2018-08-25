const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

const {initState, getState, updateState, clearTrimmed, width, height} = require('./game');

const ts = 1000 / 10;
const framesPerTurn = 2;

const RoomType = {
    FFA: "ffa",
    CUSTOM: "custom",
    TUTORIAL: "tutorial"
};

const GameStatus = {
    QUEUING: "queuing",
    IN_PROGRESS: "inProgress"
};

const ClientStatus = {
    CONNECTED: "connected",
    CONNECTING: "connecting",
    DISCONNECTED: "disconnected"
};

let rooms = {};
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

function randString() {
    return crypto.randomBytes(10).toString('hex');
}

function initOrGetRoom(roomId, roomType) {
    if (!(roomId in rooms)) {
        let numPlayers;
        switch (roomType) {
            case RoomType.FFA:
                numPlayers = 4;
                break;
            case RoomType.CUSTOM:
                numPlayers = 2;
                break;
            case RoomType.TUTORIAL:
                numPlayers = 1;
                break;
            default:
                numPlayers = null;
        }
        rooms[roomId] = {
            id: roomId,
            type: roomType,
            clients: [],
            waitingClients: [],
            gameInterval: null,
            frameCounter: 0,
            gameStatus: GameStatus.QUEUING,
            numPlayers: numPlayers
        };
    }
    return rooms[roomId];
}

function onConnect(room, ws) {
    ws.ponged = true;
    ws.missedPongs = 0;
    ws.status = ClientStatus.CONNECTED;
    ws.playerId = randString();
    ws.name = `player_${ws.playerId}`;
    ws.secret = randString();
    console.log(`player ${ws.playerId} connected to ${room.id}`);
    ws.send(JSON.stringify({
        event: 'connected',
        playerId: ws.playerId,
        secret: ws.secret
    }));

    // ping pong for client status
    ws.on('pong', () => {
        ws.ponged = true;
    });
    ws.heartbeatInterval = setInterval(() => {
        if (ws.readyState === 1) {
            if (ws.ponged) {
                ws.status = ClientStatus.CONNECTED;
                ws.ponged = false;
                ws.missedPongs = 0;
            } else {
                ws.status = ClientStatus.CONNECTING;
                ws.missedPongs++;
                if (ws.missedPongs === 10) {
                    ws.status = ClientStatus.DISCONNECTED;
                }
            }
            ws.ping();
        } else {
            ws.status = ClientStatus.DISCONNECTED;
        }
        if (ws.status === ClientStatus.DISCONNECTED) {
            ws.close();
            clearInterval(ws.heartbeatInterval);
        }
    }, 1000);
}

function onClose(room, ws) {
    ws.on('close', () => {
        room.clients = room.clients.filter(client => (client !== ws));
        room.waitingClients = room.waitingClients.filter(client => (client !== ws));
        ws.status = ClientStatus.DISCONNECTED;
        checkRoomState(room);
        console.log(ws.playerId + ' closed connection');
    });
}

function onMessage(room, ws) {
    ws.on('message', function (msg) {
        let data = JSON.parse(msg);
        if (data.event === 'move') {
            // console.log('received', data);
            if (data.secret === ws.secret) {
                let queues = room.queues;
                let trimmed = room.trimmed;
                data.move.playerId = ws.playerId;
                if (data.move.action === "spawn") {
                    queues[ws.playerId]["spawn"].push(data.move);
                } else if (data.move.action.includes("move")) {
                    if (data.move.unitId && (data.move.unitId in queues[ws.playerId])) {
                        queues[ws.playerId][data.move.unitId].push(data.move);
                    }
                } else if (data.move.action === "cancelUnitQueue") {
                    queues[ws.playerId][data.move.unitId] = [];
                    trimmed[ws.playerId][data.move.unitId] = true;
                } else if (data.move.action === "cancelPlayerQueues") {
                    Object.keys(queues[ws.playerId]).forEach(unitId => {
                        queues[ws.playerId][unitId] = [];
                        trimmed[ws.playerId][unitId] = true;
                    });
                }
            }
        } else if (data.event === 'veil') {
            room.fogOfWar = true;
        } else if (data.event === 'exit') {
            ws.close();
        }
    });
}

function tryStartGame(room) {
    // only keep connected clients
    let connectedClients = room.waitingClients.filter(client => (client.status !== ClientStatus.DISCONNECTED));
    if (connectedClients.length >= room.numPlayers) {
        room.clients = connectedClients.slice(0, room.numPlayers);
        connectedClients = connectedClients.slice(room.numPlayers, connectedClients.length);

        // set message handlers
        room.clients.forEach(client => onMessage(room, client));
        runGame(room);
    }
    room.waitingClients = connectedClients;
}

function connectToRoom(room, ws) {
    room.waitingClients.push(ws);

    onConnect(room, ws);
    onClose(room, ws);

    if (room.gameStatus === GameStatus.QUEUING) {
        tryStartGame(room);
    }
}

app.ws('/ffa', function (ws, req) {
    if (!queueRoomId) {
        queueRoomId = 'ffa-' + randString();
    }
    let room = initOrGetRoom(queueRoomId, RoomType.FFA);
    connectToRoom(room, ws);
    if (room.gameStatus === GameStatus.IN_PROGRESS) {
        queueRoomId = null;
    }
});

app.ws('/room/:roomId', function (ws, req) {
    let roomId = req.params.roomId;
    let room = initOrGetRoom(roomId, RoomType.CUSTOM);
    connectToRoom(room, ws);
});

app.ws('/tutorial', function (ws, req) {
    let tutorialRoomId = 'tutorial-' + randString();
    let room = initOrGetRoom(tutorialRoomId, RoomType.TUTORIAL);
    connectToRoom(room, ws);
});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

getPerformOneTurn = targetRoom => {
    return function performOneTurn() {
        room = targetRoom;
        checkRoomState(room);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            let gameEnded = updateState(room, (room.roomType === RoomType.FFA));
            incrementFrameCounter(room);
            broadcastState(room);
            clearTrimmed(room);
            if (gameEnded) {
                room.gameStatus = GameStatus.QUEUING;
                room.clients.forEach(ws => {
                    if (ws.status === ClientStatus.CONNECTED) {
                        ws.close();
                    }
                });                
                checkRoomState(room);
            }
        }
    };    
};


function runGame(room) {
    console.log('start game');
    room.gameStatus = GameStatus.IN_PROGRESS;
    broadcastStarting(room);
    initState(room, room.type === RoomType.TUTORIAL);
    broadcastInit(room);
    room.gameInterval = setInterval(
        getPerformOneTurn(room),
        ts
    );
}

function checkRoomState(room) {
    let clients = room.clients.filter(client => (client.status !== ClientStatus.DISCONNECTED));
    if (clients.length === 0) {
        clearInterval(room.gameInterval);
        tryStartGame(room);
        if (room.gameStatus === GameStatus.QUEUING && room.waitingClients.length === 0) {
            delete rooms[room.id];
            delete room;
            console.log("deleting room with id " + room.id);
        }
    }
}

function broadcastStarting(room) {
    room.clients.forEach(ws => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({event: 'starting'}));
        }
    });
    console.log(`sent starting to ${room.id}`);
}

function broadcastInit(room) {
    let playerBases = room.playerBases;
    let spawnSquares = room.spawnSquares;
    let playerIds = room.playerIds;
    room.clients.forEach(ws => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({
                'event': 'init',
                'playerIds': playerIds,
                'base': playerBases[ws.playerId],
                'spawn': spawnSquares[ws.playerId],
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
