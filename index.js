const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const {ungzip} = require('node-gzip');

const app = express();
const expressWs = require('express-ws')(app);

const logger = require('./winston');
const {initState, getState, updateState, clearTrimmedAndSpawned, calculateNewRatings} = require('./game');
const {randString} = require('./util')
const {RoomType, ClientStatus, ReadyType, GameType, UnitType, MaxMessageLength, AdminUsername} = require('./config');
const recorder = require('./recorder');

// constants
const gameTickInterval = 1000 / 8;
const framesPerTurn = 8;
const gameDelaySec = 3;
const statisticInterval = 60000;
const port = process.env.TEST ? 5555 : 5000;
const maxChatMessages = 1000;

const GameStatus = {
    QUEUING: "queuing",
    IN_PROGRESS: "inProgress"
};

// globals
let users = null;
let games = null;
let leaderboard = null;
let nameToInfo = null;
let rooms = {};
let roomListeners = [];
let homepageListeners = [];
let chat = [];
let queueRoomId = 'ffa-' + randString(8);

setInterval(logStatistics, statisticInterval);

MongoClient.connect('mongodb://localhost:27017/db', { useNewUrlParser: true }, (err, db) => {
    if (err) {
        logger.info(err);
        throw err;
    }
    let databaseName = process.env.TEST ? 'test' : 'db';
    let database = db.db(databaseName);
    logger.info(`Created database ${databaseName}`);
    users = database.collection('users');
    games = database.collection('games');
    games.createIndex({gameId: 1}, (err, result) => {
        if (err) {
            logger.error(err);
            throw err;
        }
    });
    games.createIndex({playerIds: 1}, (err, result) => {
        if (err) {
            logger.error(err);
            throw err;
        }
    });
    calculateLeaderboard();
});

function calculateLeaderboard() {
    users.find({}, {_id: 0, username: 1, ratingFFA: 1, multiplier: 1, ignore: 1}).toArray((err, result) => {
        if (err) {
            logger.error(err);
            throw err;
        }
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

        logger.info('Updated leaderboard');
    });
}

app.use(express.static(path.join(__dirname, 'client/build')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.get('/user_info', (req, res) => {
    if (req.cookies.session) {
        let query = {session: req.cookies.session};
        users.findOne(query, (err, data) => {
            if (err) {
                logger.error(err);
                res(err);
            } else if (data) {
                res.json(Object.assign({success: true}, nameToInfo[data.username]));
                logger.info(`Found user info ${JSON.stringify(nameToInfo[data.username], null, 2)}`);
            } else {
                res.clearCookie('session');
                res.json({success: false});
                logger.info(`Did not find user info for session ${query.session}. Clearing cookies`);
            }
        });
    } else {
        logger.warn('/user_info is called but there is no session');
    }
});

function set_ignore(req, res, ignore) {
    let query = {session: req.cookies.session};
    users.updateOne(query, {$set: {ignore: ignore}}, (err, ret) => {
        if (err) {
            logger.error(err);
            res(err);
        } else {
            calculateLeaderboard();
            res.json({success: true, ignore: ignore})
            logger.info(`Set ignore value of ${query} to ${ignore}`);
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
                logger.error(err);
                res(err);
            } else if (!ret.result.upserted) {
                res.json({success: false});
                logger.info(`set_username found existing user with name ${username}`);
            } else {
                res.cookie('session', insert.session, {
                    expires: new Date('June 7, 9999')
                });
                res.json(Object.assign({success: true}, insert));
                logger.info(`Created new user with name ${username} and key ${insert.session}`);
                calculateLeaderboard();
            }
        });
    } else {
        res.json({success: false});
        logger.info('set_username found empty username');
    }
});

app.get('/leaderboard', (req, res) => {
    logger.info('Sending leaderboard');
    res.json(leaderboard);
});

app.get(['/room', '/room/:roomId', '/replay/:gameId'], function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('/get_replay/:gameId', function(req, res) {
    let query = {gameId: req.params.gameId};
    games.findOne(query, (err1, data1) => {
        if (err1) {
            logger.error(err1);
            res.json({success: false});
        } else if (data1) {
            logger.info(`Found game with ID ${req.params.gameId}`);
            fs.readFile(data1.path, (err2, data2) => {
                if (err2) {
                    logger.error(err2);
                    res.json({success: false});
                } else if (data2) {
                    ungzip(data2).then((decompressed) => {
                        res.json(Object.assign({success: true}, JSON.parse(decompressed)));
                    });
                }
            });
        }
    });
});

function initOrGetRoom (roomId, roomType) {
    if (!(roomId in rooms)) {
        let maxNumPlayers;
        let minNumPlayers;
        let gameType;
        let recorded = true;
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
                recorded = false;
                break;
            default:
                minNumPlayers = null;
                maxNumPlayers = null;
                gameType = null;
                logger.error(`Room ${room.id} is not FFA, CUSTOM, or TUTORIAL`);
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
            gameType: gameType,
            recorded: recorded
        };
        logger.info(`Creating new room ${roomId}`);
    } else {
        logger.info(`Got existing room ${roomId}`);
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
    ws.user = user;
    ws.ready = ReadyType.NOT_READY;
    ws.playerId = ws.user.username;

    logger.info(`Player ${ws.user.username} connected to ${room.type} room ${room.id} with status ${room.gameStatus}`);

    ws.send(JSON.stringify({
        event: 'connected',
        playerId: ws.playerId,
        defaultGameType: room.gameType
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

    broadcastAllClientStatus(room);

    if (room.type === RoomType.FFA) {
        let numWaitingClients = room.waitingClients.length;
        if (numWaitingClients > 1) {
            if (room.forceStartInterval) {
                clearInterval(room.forceStartInterval);
            }

            if (numWaitingClients === room.maxNumPlayers) {
                makeAllWaitingClientsReady(room);
                tryStartGame(room);
            } else {
                room.forceStartSec = 30;
                broadcastForceStartSec(room);

                room.forceStartInterval = setInterval(() => {
                    room.forceStartSec -= 1;
                    broadcastForceStartSec(room);

                    if (room.forceStartSec === 0) {
                        clearInterval(room.forceStartInterval);
                        makeAllWaitingClientsReady(room);
                        tryStartGame(room);
                    } else if (room.waitingClients.length <= 1){
                        clearInterval(room.forceStartInterval);
                        room.forceStartSec = 0;
                        broadcastForceStartSec(room);
                    }
                }, 1000);
            }
        }
    } else if (room.type === RoomType.TUTORIAL) {
        makeAllWaitingClientsReady(room);
        tryStartGame(room);
    } else if (room.type === RoomType.CUSTOM) {
        broadcastRoomList();
    }
}

function onClose(room, ws) {
    ws.on('close', () => {
        room.waitingClients = room.waitingClients.filter(client => (client !== ws));
        ws.status = ClientStatus.DISCONNECTED;
        clearInterval(ws.heartbeatInterval);
        broadcastAllClientStatus(room);
        tryStartGame(room);
        if (room.type === RoomType.CUSTOM) {
            broadcastRoomList();
        }
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
        } else if (data.event === 'toggleReady') {
            if (ws.ready === ReadyType.NOT_READY) {
                ws.ready = ReadyType.READY;
            } else {
                ws.ready = ReadyType.NOT_READY;
            }
            logger.debug(`Client ${ws.user.username} switched state in room ${room.id} to ${ws.ready}`);
            broadcastAllClientStatus(room);

            if (ws.ready === ReadyType.READY) {
                tryStartGame(room);
            }
        } else if (data.event === 'veil') {
            room.fogOfWar = true;
        } else if (data.event === 'changeGame') {
            if (room.gameStatus === GameStatus.QUEUING) {
                room.gameType = data.gameType;
                broadcastChangeGameType(room);
            }
            logger.debug(`Client ${ws.user.username} changed game type in room ${room.id} to ${data.gameType}`);
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
        logger.warn(`Prevented duplicate connection for ${user.username} room ${room.id}`);
        ws.close();
    } else if (room.type === RoomType.CUSTOM && (room.waitingClients.length + room.clients.length) === room.maxNumPlayers) {
        logger.info(`User ${user} attempted to connect to full room ${room.id}`);
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
            users.findOne({session: session}, (err, data) => {
                if (err) {
                    logger.error(err);
                    reject(session);
                } else if (!data) {
                    logger.warn(`Could not find session ${data.session} in users`);
                    reject(session);
                } else {
                    logger.info(`Verify success with username ${data.username} session ${data.session}`);
                    resolve(data)
                }
            });
        }
    });
}

app.ws('/', (ws, req) => {
    verifyUser(ws).then(user => {
        homepageListeners.push(ws);
        ws.lastMessageTime = Date.now();
        ws.send(JSON.stringify({
            event: 'connected',
            messages: chat.slice(-8)
        }));

        ws.on('message', function (msg) {
            let data = JSON.parse(msg);
            if (data.event === 'chat') {
                if (data.message.length > 0 && data.message.length <= MaxMessageLength) {
                    // console.log(`User ${user.username} sent new message: "${data.message}"`)
                    let currentTime = Date.now();
                    if ((currentTime - ws.lastMessageTime) > 500) {
                        let new_message = {
                            username: user.username,
                            message: data.message,
                            timestamp: currentTime
                        };
                        addMessageToChat(new_message);
                    } else {
                        ws.send(JSON.stringify({
                            event: 'chat',
                            username: AdminUsername,
                            message: 'You are sending messages too fast!',
                            timestamp: currentTime
                        }));
                    }
                    ws.lastMessageTime = currentTime;
                }
            }
        });

        ws.on('close', () => {
            homepageListeners = homepageListeners.filter(client => (client !== ws));
        });
    }).catch(session => { // session not found in database, redirect
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });
});

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
    broadcastRoomList([ws]);
    ws.on('close', () => {
        roomListeners = roomListeners.filter(client => (client !== ws));
    });
});

app.listen(port, () => {
    logger.info(`App listening on port ${port}`);
});

addMessageToChat = message => {
    let ix = chat.length - 1;
    while (ix >= 0 && chat[ix].timestamp > message.timestamp) {
        ix --;
    }
    if (ix < 0
            || chat[ix].timestamp != message.timestamp
            || chat[ix].message != message.message
            || chat[ix].username != message.username) {
        chat.splice(ix+1, 0, message);
        broadcastChat(message);
    }

    while (chat.length > maxChatMessages) {
        chat.shift();
    }
}

getPerformOneTurn = targetRoom => {
    return function performOneTurn() {
        room = targetRoom;
        checkRoomState(room);
        if (room.gameStatus === GameStatus.IN_PROGRESS) {
            let gameEnded = updateState(room);
            if (gameEnded) {
                logger.info(`Game ended at room ${room.id}`);
                if (room.type === RoomType.FFA) {
                    calculateNewRatings(room);
                    room.clients.forEach(client => {
                        let query = {username: client.user.username};
                        let newValues = { $set: {
                            ratingFFA: client.user.ratingFFA,
                            multiplier: Math.min(client.user.multiplier + 0.1, 1.0)
                        }};

                        users.updateOne(query, newValues, (err, res) => {
                            if (err) {
                                logger.error(err);
                                throw err;
                            }
                        });
                    });
                    calculateLeaderboard();
                }
                recorder.finishRecordAndSave(room, games);
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

    if (room.type !== RoomType.TUTORIAL) {
        if (room.forceStartInterval) {
            clearInterval(room.forceStartInterval);
        }
    }

    broadcastStarting(room);
    initState(room);
    broadcastInit(room);

    room.waitingSec = gameDelaySec;
    broadcastWaitingSec(room);
    room.waitingInterval = setInterval(() => { // delay start of game by gameDelaySec
        room.waitingSec -= 1;
        broadcastWaitingSec(room);

        if (room.waitingSec === 0) {
            room.gameInterval = setInterval(
                getPerformOneTurn(room),
                gameTickInterval
            );
            clearInterval(room.waitingInterval);
        }
    }, 1000);
    logger.info(`Started game with players ${JSON.stringify(room.clients.map(ws => ws.user.username), null, 2)}`);
}

function checkRoomState(room) {
    let clients = room.clients.filter(client => (client.status !== ClientStatus.DISCONNECTED));

    if (clients.length === 0) {
        clearInterval(room.gameInterval);
        room.gameStatus = GameStatus.QUEUING;
        if (room.waitingClients.length === 0 && room.id in rooms) {
            delete rooms[room.id];
            logger.info(`Deleting room with id ${room.id}`);
        }
        else {
            tryStartGame(room);
        }
    }
}

function getAllClientStatus(room) {
    let allClientStatus = {};
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            allClientStatus[ws.playerId] = {
                'name': ws.user.username,
                'ready': ws.ready
            }
        }
    });
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            allClientStatus[ws.playerId] = {
                'name': ws.user.username,
                'ready': ReadyType.PLAYING
            }
        }
    });
    return allClientStatus;
}

function broadcastChat(message) {
    homepageListeners.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                event: 'chat',
                username: message.username,
                message: message.message,
                timestamp: message.timestamp
            }));
        }
    });
}

function broadcastWaitingSec(room) {
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                event: 'waitingSec',
                seconds: room.waitingSec
            }));
        }
    });
}

function broadcastForceStartSec(room) {
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                event: 'forceStartSec',
                seconds: room.forceStartSec
            }));
        }
    });
}

function broadcastChangeGameType(room) {
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                event: 'setGameType',
                gameType: room.gameType,
            }));
        }
    });
}

function broadcastAllClientStatus(room) {
    let allClientStatus = getAllClientStatus(room);
    room.waitingClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                event: 'setAllClientStatus',
                allClientStatus: allClientStatus
            }));
        }
    });
    if (room.waitingClients) logger.info(`Broadcasted client statuses ${JSON.stringify(allClientStatus, null, 2)} to room ${room.id}`);
}

function broadcastRoomList(listeners = roomListeners) {
    let roomList = Object.values(rooms).filter(room => room.type === RoomType.CUSTOM)
        .map(room => ({
            id: room.id,
            gameStatus: room.gameStatus,
            maxNumPlayers: room.maxNumPlayers,
            numPlayersIn: room.waitingClients.length + room.clients.length
        }));
    listeners.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                event: 'room_list',
                roomList: roomList
            }));
        }
    });
    if (roomListeners) logger.info(`Broadcasted ${roomList.length} rooms to ${roomListeners.length} clients`);
}

function broadcastStarting(room) {
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({event: 'starting'}));
        }
    });
    logger.info(`Broadcasted starting for room ${room.id}`);
}

function broadcastInit(room) {
    let playerBases = room.playerBases;
    let spawnSquares = room.spawnSquares;
    let playerIds = room.playerIds;
    let [height, width] = room.shape;
    let gameId = room.gameId;
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                'event': 'init',
                'playerIds': playerIds,
                'base': playerBases[ws.playerId],
                'spawn': spawnSquares[ws.playerId],
                'width': width,
                'height': height,
                'gameId': gameId,
            }));
        }
    });
    logger.info(`Broadcasted init to room ${room.id}`);
}

function broadcastState(room) {
    room.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({event: 'update', 'state': getState(room, ws.playerId)}));
        }
    });
}

function incrementFrameCounter(room) {
    room.frameCounter = (room.frameCounter + 1) % framesPerTurn;
}

function countClients(rooms) {
    return rooms.map(room => room.clients.length).reduce((a, b) => a + b, 0);
}

function countWaitingClients(rooms) {
    return rooms.map(room => room.waitingClients.length).reduce((a, b) => a + b, 0);
}

function logStatistics() {
    let allRooms = Object.values(rooms);
    logger.info(`------------- Begin statistics -------------`);
    logger.info(`${allRooms.length} rooms, ${countClients(allRooms)} clients, ${countWaitingClients(allRooms)}`);
    [RoomType.FFA, RoomType.CUSTOM].forEach(roomType => {
        let typedRooms = allRooms.filter(room => room.type === roomType);
        [GameStatus.IN_PROGRESS, GameStatus.QUEUING].forEach(status => {
            let statusedRooms = typedRooms.filter(room => room.gameStatus === status);
            logger.info(`${statusedRooms.length} ${roomType} rooms ${status}, ${countClients(statusedRooms)} clients, ${countWaitingClients(statusedRooms)} waiting clients`);
        });
    });
    logger.info(`${homepageListeners.length} people on home page`);
    logger.info(`${roomListeners.length} people on room list page`);
    logger.info(`------------- End statistics -------------`);
}
