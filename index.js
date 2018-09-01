const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const path = require('path');
const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const {initState, getState, updateState, clearTrimmedAndSpawned, calculateNewRatings} = require('./game');
const {RoomType, ClientStatus, ReadyType, GameType, UnitType} = require('./config');

const gameTickInterval = 1000 / 8;
const framesPerTurn = 8;
const gameDelayInterval = 3000;
const port = process.env.TEST ? 5555 : 5000;

const GameStatus = {
    QUEUING: "queuing",
    IN_PROGRESS: "inProgress"
};

let mongoUrl = 'mongodb://localhost:27017/db';
let users = null;
MongoClient.connect(mongoUrl, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    let databaseName = process.env.TEST ? 'test' : 'db';
    let database = db.db(databaseName);
    console.log('Created database', databaseName);
    users = database.collection('users');
    calculateLeaderboard();
});

let leaderboard = null;
let nameToInfo = null;
function calculateLeaderboard() {
    if (users === null) {
        return;
    }
    users.find({}, {_id: 0, username: 1, ratingFFA: 1, multiplier: 1, ignore: 1}).toArray((err, result) => {
        result.forEach(r => {
            r.ratingFFA = Math.round(r.ratingFFA * r.multiplier);
        });
        unignored = result.filter(r => !r.ignore);
        unignored.sort((a, b) => (b.ratingFFA - a.ratingFFA));
        unignored = unignored.map((r, index) => ({username: r.username, ratingFFA: r.ratingFFA, ranking: index + 1}));
        leaderboard = unignored.slice(0, 100);

        nameToInfo = {};
        unignored.forEach(user => {
            nameToInfo[user.username] = user;
        });

        ignored = result.filter(r => r.ignore);
        ignored.forEach(user => {
            nameToInfo[user.username] = user;
        });
        
        console.log('Updated leaderboard');
    });
}

let roomListeners = [];

function randString(length) {
    return crypto.randomBytes(length / 2).toString('hex');
}

let rooms = {};
let queueRoomId = 'ffa-' + randString(8);

app.use(express.static(path.join(__dirname, 'client/build')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.get('/user_info', (req, res) => {
    let query = {session: req.cookies.session};
    users.findOne(query, (err, data) => {
        if (err) {
            console.log(err);
            res(err);
        } else if (data) {
            res.json(Object.assign({success: true}, nameToInfo[data.username]));
            console.log('Found user info', nameToInfo[data.username])
        } else {
            res.clearCookie('session');
            res.json({success: false});
            console.log('Did not find user info', query, 'clearing cookies');
        }
    });
});

function set_ignore(req, res, ignore) {
    let query = {session: req.cookies.session};
    users.updateOne(query, {$set: {ignore: ignore}}, (err, ret) => {
        if (err) {
            console.log(err);
            res(err);
        } else {
            calculateLeaderboard();
            res.json({success: true, ignore: ignore})
            console.log('Set ignore value of', query, 'to be', ignore);
        }
    });
}

app.get('/ignore_username', (req, res) => {
    set_ignore(req, res, true);
})

app.get('/unignore_username', (req, res) => {
    set_ignore(req, res, false);
})

function getNewUser(username) {
    return {
        username: username,
        session: randString(100),
        ratingFFA: 1000,
        multiplier: 0
    }
}

app.post('/set_username', (req, res) => {
    let username = req.body.username;
    if (username && !req.cookies.session) { // make sure not empty string and that session does not already exist
        let query = {username: username};
        let insert = getNewUser(username);
        users.updateOne(query, {$setOnInsert: insert}, {upsert: true}, (err, ret) => {
            if (err) {
                console.log(err);
                res(err);
            } else if (!ret.result.upserted) {
                res.json({success: false});
                console.log('Found existing user with name', username);
            } else {
                res.cookie('session', insert.session);
                res.json(Object.assign({success: true}, insert));
                console.log('Created new user with name', username, 'and key', insert.session);
                calculateLeaderboard();
            }
        });
    } else {
        res.json({success: false});
        console.log('Empty username');
    }
});

app.get('/leaderboard', function (req, res) {
    res.json(leaderboard);
    console.log('Sent leaderboard');
});

app.get('/room_list', function (req, res) {
    let roomList = Object.values(rooms).filter(room => room.type === RoomType.CUSTOM)
        .map(room => {
            return {
                id: room.id,
                gameStatus: room.gameStatus,
                maxNumPlayers: room.maxNumPlayers,
                numPlayersIn: room.waitingClients.length + room.clients.length
            };
        });
    res.json(roomList);
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
                minNumPlayers = 2;
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

function makeAllWaitingClientsReady(room) {
    room.waitingClients.forEach(client => {
        client.ready = ReadyType.READY;
    });
}

function onConnect(room, ws, user) {
    ws.ponged = true;
    ws.missedPongs = 0;
    ws.status = ClientStatus.CONNECTED;
    ws.playerId = randString(8);
    ws.user = user;
    ws.secret = randString(20);
    ws.ready = ReadyType.NOT_READY;
    console.log(`player ${ws.user.username} connected to ${room.id} with status ${room.gameStatus}`);
    ws.send(JSON.stringify({
        event: 'connected',
        playerId: ws.playerId,
        secret: ws.secret,
        gameType: room.gameType
    }));
    onMessage(room, ws);

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

    if (room.type === RoomType.FFA) {
        let numWaitingClients = room.waitingClients.length;
        let forceStartFn = e => {
            broadcastForceStartSec(room);
            if (room.forceStartSec === 0) {
                clearInterval(room.forceStartInterval);
                makeAllWaitingClientsReady(room);
                tryStartGame(room);
            }
            room.forceStartSec -= 1;
        }
        if (numWaitingClients > 1) {
            room.forceStartSec = 30;

            if (room.forceStartInterval) {
                clearInterval(room.forceStartInterval);
            }

            if (numWaitingClients === room.maxNumPlayers) {
                makeAllWaitingClientsReady(room);
                tryStartGame(room);
            } else {
                room.forceStartInterval = setInterval(
                    forceStartFn,
                    1000
                );
            }
        }
    } else if (room.type === RoomType.TUTORIAL) {
        makeAllWaitingClientsReady(room);
        tryStartGame(room);
    }
}

function onClose(room, ws) {
    ws.on('close', () => {
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
                    if (data.move.type === UnitType.ATTACKER) {
                        spawned[ws.playerId] = true;
                    }
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

function connectToRoom(room, ws, user) {
    let duplicatePlayer = false;
    room.waitingClients.forEach(client => {
        duplicatePlayer = duplicatePlayer || (client.user.session === user.session);
    });
    if (duplicatePlayer) {
        console.log('Prevented', user, 'from connecting to room', room.id, 'twice');
        ws.close();
    } else if (room.type === RoomType.CUSTOM && ((room.waitingClients.length + room.clients.length) === room.maxNumPlayers)) {
        ws.send(JSON.stringify({event: 'full'}));
        ws.close();
    } else {
        room.waitingClients.push(ws);
        onConnect(room, ws, user);
        onClose(room, ws);
    }
}

expressWs.getWss().on('connection', (ws, req) => {
    if (ws.finishConnecting) {
        ws.finishConnecting(req.cookies.session);
    }
});

function verifyUser(ws) {
    return new Promise((resolve, reject) => {
        ws.finishConnecting = session => { // promise gets resolved or rejected when finishConnecting gets called by expressWs.getWss().on('connection')
            console.log('Verifying new ws connection with session', session);
            users.findOne({session: session}, (err, data) => {
                if (err || !data) {
                    console.log(err);
                    reject(session);
                } else {
                    console.log('Verify success with username', data.username, 'session', data.session);
                    resolve(data)
                }
            });
        }
    });
}

app.ws('/ffa', (ws, req) => {
    verifyUser(ws).then(user => {
        let room = initOrGetRoom(queueRoomId, RoomType.FFA);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            queueRoomId = 'ffa-' + randString(8);
            room = initOrGetRoom(queueRoomId, RoomType.FFA);
        }
        connectToRoom(room, ws, user);
    }).catch(session => { // session not found in database, redirect
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });
});

app.ws('/room/:roomId', (ws, req) => {
    verifyUser(ws).then(user => {
        let roomId = req.params.roomId;
        let room = initOrGetRoom(roomId, RoomType.CUSTOM);
        connectToRoom(room, ws, user);
    }).catch(session => { // session not found in database, redirect
        ws.send(JSON.stringify({event: 'noSession'}));
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });
});

app.ws('/tutorial', (ws, req) => {
    let tutorialRoomId = 'tutorial-' + randString(8);
    let room = initOrGetRoom(tutorialRoomId, RoomType.TUTORIAL);
    connectToRoom(room, ws, {username: 'tutorial'});
});

app.ws('/room_list', (ws, req) => {
    roomListeners.push(ws);
    ws.on('close', () => {
        roomListeners = roomListeners.filter(client => (client !== ws));
    });
});

app.listen(port, () => {
    console.log('App listening on port', port);
});

getPerformOneTurn = targetRoom => {
    return function performOneTurn() {
        room = targetRoom;
        checkRoomState(room);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            let gameEnded = updateState(room);
            if (gameEnded) {
                console.log("Game ended at room id", room.id);
                if (room.type === RoomType.FFA) {
                    calculateNewRatings(room);
                    let usernameList = [];
                    room.clients.forEach(client => {
                        let query = {username: client.user.username};
                        let newValues = { $set: {
                            ratingFFA: client.user.ratingFFA,
                            multiplier: Math.min(client.user.multiplier + 0.1, 1.0)
                        }};

                        users.updateOne(query, newValues, function(err, res) {
                            if (err) throw err;
                        });
                    });
                    calculateLeaderboard();
                }
            }
            incrementFrameCounter(room);
            broadcastState(room);
            clearTrimmedAndSpawned(room);

            if (gameEnded) {
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
    if (room.type === RoomType.FFA && queueRoomId === room.id) {
        queueRoomId = 'ffa-' + randString(8);
    }
    room.clients.forEach(client => {
        client.ready = ReadyType.PLAYING;
    });
    broadcastStarting(room);
    initState(room);
    broadcastInit(room);
    setTimeout(() => { // delay start of game by gameDelayInterval
        room.gameInterval = setInterval(
            getPerformOneTurn(room),
            gameTickInterval
        )
    }, gameDelayInterval);
}

function checkRoomState(room) {
    let clients = room.clients.filter(client => (client.status !== ClientStatus.DISCONNECTED));

    if (clients.length === 0) {
        clearInterval(room.gameInterval);
        room.gameStatus = GameStatus.QUEUING;
        if (room.waitingClients.length === 0 && room.id in rooms) {
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
                'name': ws.user.username,
                'ready': ws.ready
            }
        }
    });
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            waitingClientStatus[ws.playerId] = {
                'name': ws.user.username,
                'ready': ReadyType.PLAYING
            }
        }
    });
    return waitingClientStatus;
}


function broadcastForceStartSec(room) {
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                'event': 'forceStartSec',
                'seconds': room.forceStartSec
            }));
        }
    });
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
