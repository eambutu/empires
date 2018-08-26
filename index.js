const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');
const MongoClient = require('mongodb').MongoClient;
const cookieParser = require('cookie-parser');
var getRandomName = require('node-random-name');

const {initState, getState, updateState, clearTrimmedAndSpawned, calculateNewRatings} = require('./game');
const {RoomType, ClientStatus, ReadyType} = require('./config');

const ts = 1000 / 8;
const framesPerTurn = 8;

const GameStatus = {
    QUEUING: "queuing",
    IN_PROGRESS: "inProgress"
};

let mongoUrl = 'mongodb://localhost:27017/db';
let database = null;
let users = null;
MongoClient.connect(mongoUrl, (err, db) => {
    if (err) throw err;
    console.log('Database created!');
    database = db.db();
    users = database.collection('users');
});

function randString() {
    return crypto.randomBytes(10).toString('hex').substring(0,7);
}

function randSecret() {
    return crypto.randomBytes(10).toString('hex');
}

function randKey() {
    return crypto.randomBytes(50).toString('hex');
}

let rooms = {};
let queueRoomId = null;

app.use(express.static(path.join(__dirname, 'client/build')));
app.use(cookieParser());

function createNewUserSession(res) {
    console.log('Create new user session');
    let username = getRandomName();
    let query = {username: username};
    users.findOne(query, (err, data) => {
        if (err) {
            console.log(err);
            res(err);
        } else if (!data) {
            query.session = randKey();
            users.insertOne(query);
            console.log("Creating new user ", query);
            res.cookie('username', query.username);
            res.cookie('session', query.session);
            res.json({success: true});
        } else {
            createNewUserSession(res);
        }
    });
}

function queryExistingSession(session, res) {
    console.log('Querying existing session', session);
    let query = {session: session};
    users.findOne(query, (err, data) => {
        if (err || !data) {
            console.log(err);
            res.clearCookie('session');
            res.redirect('/');
            res.json({success: false});
        } else {
            console.log('Found data', data)
            res.cookie('username', data.username);
            res.json({success: true});
        }
    });
}

function insertNewUsername(username, res) {
    console.log('Insert new username', username);
    let query = {username: username};
    users.findOne(query, (err, data) => {
        if (err) {
            console.log(err)
            res(err);
        } else if (data) {
            res.clearCookie('session');
            res.clearCookie('username');
            res.json({success: false});
        } else {
            console.log('Found data', data)
            query.session = randKey();
            query.ratingFFA = 1000;
            users.insertOne(query);
            res.cookie('session', query.session);
            res.json({success: true});
        }
    });
}

function handleCookies(req, res) {
    let cookies = req.cookies;
    console.log('Received cookies', cookies);
    if (!cookies.username && !cookies.session) {
        createNewUserSession(res);
    } else if (cookies.session) {
        queryExistingSession(cookies.session, res);
    } else {
        insertNewUsername(cookies.username, res);
    }
}

function verifyCookies(req, res, callback) {
    let cookies = req.cookies;
    if (cookies.username && cookies.session) {
        let query = {username: cookies.username, session: cookies.session};
        users.findOne(query, (err, data) => {
            if (err) {
                console.log(err);
                res(err);
            } else if (data) {
                callback();
            } else {
                res.redirect('/');
            }
        });
    }
}

app.get('/cookies', function(req, res) {
    handleCookies(req, res);
});

app.get('/room_list', function (req, res) {
    let tempRooms = _.cloneDeep(rooms);
    Object.keys(tempRooms).forEach(key => {
        let numPlayersIn = tempRooms[key]['waitingClients'].length;
        tempRooms[key] = _.pick(tempRooms[key], ['id', 'type', 'gameStatus', 'numPlayers']);
        tempRooms[key]['numPlayersIn'] = numPlayersIn;
    });
    tempRooms = _.pickBy(tempRooms, function(value) {
        return (value.type === RoomType.CUSTOM && value.gameStatus === GameStatus.QUEUING);
    });
    res.send(JSON.stringify(tempRooms));
});

app.get('/room/:roomId', function (req, res) {
    handleCookies(req, res);
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get(['/room', '/tutorial'], function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

function initOrGetRoom (roomId, roomType) {
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

function verifyWs(ws, onVerify) {
    ws.on('message', function (msg) {
        let data = JSON.parse(msg);
        if (data.event === 'verify' && data.session) {
            console.log('Verifying ', data.session);
            let query = {session: data.session};
            users.findOne(query, (err, data) => {
                if (err || !data) {
                    console.log(err);
                } else {
                    console.log('Verify success with username', data.username, 'session', data.session);
                    onVerify(data.username, data.session);
                }
            });
        }
    });
}

function onConnect(room, ws, username, session, autoReady) {
    ws.ponged = true;
    ws.missedPongs = 0;
    ws.status = ClientStatus.CONNECTED;
    ws.session = session;
    ws.playerId = randString();
    ws.name = username;
    ws.secret = randSecret();
    ws.ready = autoReady ? ReadyType.READY : ReadyType.NOT_READY;
    console.log(`player ${ws.name} connected to ${room.id} with status ${room.gameStatus}`);
    ws.send(JSON.stringify({
        event: 'connected',
        playerId: ws.playerId,
        secret: ws.secret
    }));
    onMessage(room, ws);

    users.findOne({username: username}, (err, data) => {
        if (err) {
            console.log(err);
            res(err);
        } else if (data) {
            console.log("found data ", data);
            ws.rating = data.ratingFFA;
        } else {
            console.log("no data found");
            ws.rating = 0;
        }
    });

    // ping pong for client status
    ws.on('pong', () => {
        ws.ponged = true;
    });
    ws.heartbeatInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            if (ws.ponged) {
                ws.status = ClientStatus.CONNECTED;
                ws.ponged = false;
                ws.missedPongs = 0;
            } else {
                ws.status = ClientStatus.RECONNECTING;
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
        }
    }, 1000);
}

function onClose(room, ws) {
    ws.on('close', () => {
        room.clients = room.clients.filter(client => (client !== ws));
        room.waitingClients = room.waitingClients.filter(client => (client !== ws));
        ws.status = ClientStatus.DISCONNECTED;
        clearInterval(ws.heartbeatInterval);
        checkRoomState(room);
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
                let spawned = room.spawned;
                data.move.playerId = ws.playerId;
                if (data.move.action === "spawn") {
                    queues[ws.playerId]["spawn"].push(data.move);
                    spawned[ws.playerId] = true;
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
        } else if (data.event === 'toggleReady') {
            if (ws.ready === ReadyType.NOT_READY) {
                ws.ready = ReadyType.READY;
                tryStartGame(room);
            } else {
                ws.ready = ReadyType.NOT_READY;
            }
            broadcastWaitingClientStatus(room);
            ws.send(JSON.stringify({
                'event': 'setReady',
                'ready': ws.ready
            }));
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
    let readyClients = connectedClients.filter(client => (client.ready === ReadyType.READY));
    if (readyClients.length >= room.numPlayers) {
        room.clients = readyClients.slice(0, room.numPlayers);
        connectedClients = readyClients.slice(room.numPlayers, connectedClients.length);
        runGame(room);
    }
    room.waitingClients = connectedClients;
}

function connectToRoom(room, ws, username, session, autoReady) {
    if (room.type === RoomType.CUSTOM && (room.waitingClients.length === room.numPlayers ||room.gameStatus === GameStatus.IN_PROGRESS)) {
        ws.send(JSON.stringify({event: 'full'}));
        ws.close();
    } else {
        room.waitingClients.push(ws);

        onConnect(room, ws, username, session, autoReady);
        onClose(room, ws);
        broadcastWaitingClientStatus(room);

        // if (room.gameStatus === GameStatus.QUEUING) {
        //     tryStartGame(room);
        // }
    }
}

app.ws('/ffa', function (ws, req) {
    let onVerify = (username, session) => {
        if (!queueRoomId) {
            queueRoomId = 'ffa-' + randString();
        }
        let room = initOrGetRoom(queueRoomId, RoomType.FFA);
        connectToRoom(room, ws, username, session, true);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            queueRoomId = null;
        }
    };
    verifyWs(ws, onVerify)
});

app.ws('/room/:roomId', function (ws, req) {
    let onVerify = (username, session) => {
        let roomId = req.params.roomId;
        let room = initOrGetRoom(roomId, RoomType.CUSTOM);
        connectToRoom(room, ws, username, session, false);
    };
    verifyWs(ws, onVerify)
});

app.ws('/tutorial', function (ws, req) {
    let tutorialRoomId = 'tutorial-' + randString();
    let room = initOrGetRoom(tutorialRoomId, RoomType.TUTORIAL);
    connectToRoom(room, ws, 'tutorial', 'tutorial-playerId', true);
});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

getPerformOneTurn = targetRoom => {
    return function performOneTurn() {
        room = targetRoom;
        checkRoomState(room);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            let gameEnded = updateState(room);
            incrementFrameCounter(room);
            broadcastState(room);
            clearTrimmedAndSpawned(room);
            if (gameEnded) {
                if (room.type === RoomType.FFA) {
                    calculateNewRatings(room);
                    room.clients.forEach(client => {
                        console.log("new rating", client.rating);
                        let query = {username: client.name};
                        let newValues = { $set: {ratingFFA: client.rating}};

                        users.updateOne(query, newValues, function(err, res) {
                            if (err) throw err;
                        });
                    });
                }
                room.clients.forEach(ws => {
                    if (ws.status !== ClientStatus.DISCONNECTED) {
                        ws.close();
                    }
                });                
            }
        }
    };    
};


function runGame(room) {
    room.gameStatus = GameStatus.IN_PROGRESS;
    broadcastStarting(room);
    initState(room, room.type);
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
        room.gameStatus = GameStatus.QUEUING;
        tryStartGame(room);
        if (room.waitingClients.length === 0) {
            delete rooms[room.id];
            console.log("deleting room with id " + room.id);
        }
    }
}

function getWaitingClientStatus(room) {
    waitingClientStatus = {};
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            waitingClientStatus[ws.playerId] = {
                'name': ws.name,
                'ready': ws.ready
            }
        }
    });
    return waitingClientStatus;
}

function broadcastWaitingClientStatus(room) {
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                'event': 'setWaitingClientStatus',
                'waitingClientStatus': getWaitingClientStatus(room)
            }));
        }
    });
    console.log(`sent waitingClientStatus to ${room.id}`);
}

function broadcastStarting(room) {
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({event: 'starting'}));
        }
    });
    console.log(`sent starting to ${room.id}`);
}

function broadcastInit(room) {
    let playerBases = room.playerBases;
    let spawnSquares = room.spawnSquares;
    let playerIds = room.playerIds;
    let ffa = (room.type === RoomType.FFA);
    let [height, width] = room.shape;
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                'event': 'init',
                'playerIds': playerIds,
                'base': playerBases[ws.playerId],
                'spawn': spawnSquares[ws.playerId],
                'width': width,
                'height': height,
                'ffa': ffa
            }));
        }
    });
    console.log(`sent init to ${room.id}`);
}

function broadcastState(room) {
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({'event': 'update', 'state': getState(room, ws.playerId)}));
        }
    });
}

function incrementFrameCounter(room) {
    room.frameCounter = (room.frameCounter + 1) % framesPerTurn;
}
