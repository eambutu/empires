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
const {RoomType, ClientStatus, ReadyType, GameType} = require('./config');

const ts = 1000 / 8;
const framesPerTurn = 8;

const GameStatus = {
    QUEUING: "queuing",
    IN_PROGRESS: "inProgress"
};

let mongoUrl = 'mongodb://localhost:27017/db';
let database = null;
let users = null;
let roomListeners = [];

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

app.get('/user_info', (req, res) => {
    let query = {session: req.cookies.session};
    users.findOne(query, (err, data) => {
        if (err) {
            console.log(err);
            res(err);
        } else if (data) {
            res.json({success: true, username: data.username, ratingFFA: data.ratingFFA, ranking: data.ranking});
        } else {
            res.clearCookie('session');
            res.json({success: false});
        }
    });
});

function getNewUser(username) {
    return {
        username: username,
        session: randKey()
    }
}

app.get('/set_username', function(req, res) {
    let username = req.query.username;
    if (username) { // make sure not empty string
        let query = {username: username}
        users.findOne(query, (err, data) => {
            if (err) {
                console.log(err);
                res(err);
            } else if (data) {
                res.json({success: false});
                console.log('Found existing user with name', username);
            } else {
                let user = getNewUser(username);
                users.insertOne(user);
                res.cookie('session', user.session);
                res.json(Object.assign({success: true}, user));
                console.log('Created new user with name', username, 'and key', user.session);
            }
        });
    } else {
        res.json({success: false});
        console.log('Empty username');
    }
});

app.get('/leaderboard', function (req, res) {
    users.aggregate(
        [
            { "$match": { "ranking" : {"$exists" : true}}},
            { "$sort": { "ranking": 1 } }
        ], function (err, data) {
        if (err) {
            throw err;
        } else {
            data.get(function (err, result) {
                res.send(JSON.stringify(result));
            });
        }
    });
});

app.get('/room_list', function (req, res) {
    let tempRooms = _.cloneDeep(rooms);
    Object.keys(tempRooms).forEach(key => {
        let numPlayersIn = tempRooms[key]['waitingClients'].length + tempRooms[key]['clients'].length;
        tempRooms[key] = _.pick(tempRooms[key], ['id', 'type', 'gameStatus', 'maxNumPlayers']);
        tempRooms[key]['numPlayersIn'] = numPlayersIn;
    });
    tempRooms = _.pickBy(tempRooms, function(value) {
        return (value.type === RoomType.CUSTOM);
    });
    res.send(JSON.stringify(tempRooms));
});

app.get(['/room', '/room/:roomId'], function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

function initOrGetRoom (roomId, roomType) {
    if (!(roomId in rooms)) {
        let maxNumPlayers;
        let minNumPlayers;
        let gameType;
        switch (roomType) {
            case RoomType.FFA:
                minNumPlayers = 4;
                maxNumPlayers = 4;
                gameType = GameType.CTF;
                break;
            case RoomType.CUSTOM:
                minNumPlayers = 2;
                maxNumPlayers = 4;
                gameType = GameType.DUEL;
                break;
            case RoomType.TUTORIAL:
                minNumPlayers = 1;
                maxNumPlayers = 1;
                gameType = GameType.CTF;
                break;
            default:
                minNumPlayers = null;
                maxNumPlayers = null;
                gameType = null;
                break;
        }
        rooms[roomId] = {
            id: roomId,
            type: roomType,
            clients: [],
            waitingClients: [],
            gameInterval: null,
            frameCounter: 0,
            gameStatus: GameStatus.QUEUING,
            minNumPlayers: minNumPlayers,
            maxNumPlayers: maxNumPlayers,
            gameType: gameType
        };
    }
    return rooms[roomId];
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
        secret: ws.secret,
        gameType: room.gameType
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

    broadcastWaitingClientStatus(room);
    broadcastRoomList();

    if (autoReady) {
        tryStartGame(room);
    }
}

function onClose(room, ws) {
    ws.on('close', () => {
        room.clients = room.clients.filter(client => (client !== ws));
        room.waitingClients = room.waitingClients.filter(client => (client !== ws));
        ws.status = ClientStatus.DISCONNECTED;
        clearInterval(ws.heartbeatInterval);
        broadcastWaitingClientStatus(room);
        broadcastRoomList();
        let checkRoomStateFn = e => {checkRoomState(room)};
        setTimeout(
            checkRoomStateFn,
            30000
        );
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
            } else {
                ws.ready = ReadyType.NOT_READY;
            }
            broadcastWaitingClientStatus(room);
            ws.send(JSON.stringify({
                'event': 'setReady',
                'ready': ws.ready
            }));

            if (ws.ready === ReadyType.READY) {
                tryStartGame(room);
            }
        } else if (data.event === 'veil') {
            room.fogOfWar = true;
        } else if (data.event === 'exit') {
            ws.close();
        } else if (data.event === 'changeGame') {
            if (room.gameStatus === GameStatus.QUEUING) {
                room.gameType = data.gameType;
                broadcastChangeGameType(room);      
            }
        }
    });
}

function tryStartGame(room) {
    // only keep connected clients
    let connectedClients = room.waitingClients.filter(client => (client.status !== ClientStatus.DISCONNECTED));
    let readyClients = connectedClients.filter(client => (client.ready === ReadyType.READY));
    let numConnectedClients = connectedClients.length;
    let numReadyClients = readyClients.length;

    if (numReadyClients >= room.minNumPlayers && 
            numReadyClients === numConnectedClients && 
                room.gameStatus === GameStatus.QUEUING) {
        room.clients = readyClients.slice(0, numReadyClients);
        connectedClients = readyClients.slice(numReadyClients, connectedClients.length);
        runGame(room);
    }
    room.waitingClients = connectedClients;
}

function connectToRoom(room, ws, username, session, autoReady) {
    if (room.type === RoomType.CUSTOM && ((room.waitingClients.length + room.clients.length) === room.maxNumPlayers)) {
        ws.send(JSON.stringify({event: 'full'}));
        ws.close();
    } else {
        room.waitingClients.push(ws);

        onConnect(room, ws, username, session, autoReady);
        onClose(room, ws);
    }
}

function verifyWs(ws) {
    return new Promise((resolve, reject) => {
        ws.on('message', function (msg) {
            let data = JSON.parse(msg);
            if (data.event === 'verify' && data.session) {
                console.log('Verifying ', data.session);
                let query = {session: data.session};
                users.findOne(query, (err, data) => {
                    if (err || !data) {
                        console.log(err);
                        reject(query.session);
                    } else {
                        console.log('Verify success with username', data.username, 'session', data.session);
                        resolve(data.username, data.session)
                    }
                });
            } else {
                reject(null);
            }
        });
    });
}

app.ws('/ffa', (ws, req) => {
    verifyWs(ws).then((username, session) => {
        if (!queueRoomId) {
            queueRoomId = 'ffa-' + randString();
        }
        let room = initOrGetRoom(queueRoomId, RoomType.FFA);
        connectToRoom(room, ws, username, session, true);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            queueRoomId = null;
        }
    }).catch((session) => { // session not found in database, redirect
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });
});

app.ws('/room/:roomId', (ws, req) => {
    verifyWs(ws).then((username, session) => {
        let roomId = req.params.roomId;
        let room = initOrGetRoom(roomId, RoomType.CUSTOM);
        connectToRoom(room, ws, username, session, false);
    }).catch((session) => { // session not found in database, redirect
        ws.send(JSON.stringify({event: 'noSession'}));
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });
});

app.ws('/tutorial', (ws, req) => {
    let tutorialRoomId = 'tutorial-' + randString();
    let room = initOrGetRoom(tutorialRoomId, RoomType.TUTORIAL);
    connectToRoom(room, ws, 'tutorial', 'tutorial-playerId', true);
});

app.ws('/room_list', (ws, req) => {
    roomListeners.push(ws);
    ws.on('close', () => {
        roomListeners = roomListeners.filter(client => (client !== ws));

    });
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
                    calculateRankings();
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
    room.clients.forEach(client => {
        client.ready = ReadyType.PLAYING;
    });
    broadcastStarting(room);
    initState(room);
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
        if (room.waitingClients.length === 0) {
            delete rooms[room.id];
            console.log("deleting room with id " + room.id);
        }
        else {
            tryStartGame(room);
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
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            waitingClientStatus[ws.playerId] = {
                'name': ws.name,
                'ready': ReadyType.PLAYING
            }
        }
    });
    return waitingClientStatus;
}

function broadcastChangeGameType(room) {
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                'event': 'setGameType',
                'gameType': room.gameType,
            }));
        }
    });
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
    console.log(roomListeners.length);
}

function broadcastRoomList() {
    roomListeners.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                'event': 'refresh_room_list'
            }));
        }
    });
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

function calculateRankings() {
    users.aggregate(
    [
        { "$match": { "ratingFFA" : {"$exists" : true}}},
        { "$sort": { "ratingFFA": -1 } },
        {
            "$group": {
                "_id": false,
                "rankedUsers": {
                    "$push": {
                        "username": "$username",
                        "session": "$session",
                        "ratingFFA": "$ratingFFA"
                    }
                }
            }
        },
        {
            "$unwind": {
                "path": "$rankedUsers",
                "includeArrayIndex": "ranking"
            }
        }
    ], function (err, data) {
        if (err) {
            throw err;
        } else {
            data.get(function (err, result) {
                result.forEach(entry => {
                    let query = entry.rankedUsers;
                    let rank = { $set: {ranking: entry.ranking}};

                    users.updateOne(query, rank, function(err, res) {
                        if (err) throw err;
                    });
                });
            })
        }
    });
}