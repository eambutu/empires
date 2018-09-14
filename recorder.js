const fs = require('fs');
const {gzip} = require('node-gzip');

const logger = require('./winston');
const {SquareState} = require('./util')
const {SquareType} = require('./config');

function copySquareState(square) {
    let unit = square.getUnit();
    let units = unit ? [Object.assign({}, unit, {id: undefined})] : [];
    return new SquareState(Object.assign({}, square, {units}));
}

function recordInitial(room) {
    if (room.recorded) {
        room.lastSquareStates = room.squareStates.map(row => row.map(square => copySquareState(square)));
        let initialState = room.lastSquareStates.map(row => row.map(square => square));
        room.record = {initial: initialState, ticks: [], startTime: new Date()};
    }
}

function hasUnitChanged(unit, lastUnit) {
    if (unit === null && lastUnit === null) {
        return false;
    } else if (unit === null) {
        return true;
    } else if (lastUnit === null) {
        return true;
    } else {
        let changes = ['playerId', 'type', 'count'].filter(attr => (unit[attr] !== lastUnit[attr]));
        return changes.length ? true : false;
    }
}

function hasSquareChanged(square, lastSquare) {
    let changes = ['type', 'baseId', 'baseHP', 'isFog'].filter(attr => (square[attr] !== lastSquare[attr]));
    if (changes.length) {
        return true;
    }
    return hasUnitChanged(square.getUnit(), lastSquare.getUnit());
}

function recordUpdate(room) {
    if (room.recorded && room.record) {
        let changedSquares = [];
        let lastSquareStates = room.lastSquareStates;
        room.squareStates.forEach((row, y) => {
            row.forEach((square, x) => {
                let lastSquare = lastSquareStates[y][x];
                if (hasSquareChanged(square, lastSquare)) {
                    square = copySquareState(square);
                    square.y = y;
                    square.x = x;
                    changedSquares.push(square);
                    lastSquareStates[y][x] = square;
                }
            });
        });
        room.record.ticks.push({
            squares: changedSquares,
            shards: Object.assign({}, room.shards),
            flags: Object.assign({}, room.flags)
        });
    }
}

function finishRecordAndSave(room, collection) {
    if (room.recorded && room.record) {
        let record = room.record;
        record.result = Object.assign({}, room.gameWonStatus);
        
        let savePath = writeRecordToFile(record, room.gameId);
        writeRecordToDatabase(room.gameId, room.playerIds, record.startTime, savePath, collection);
        delete room.record;
        delete room.gameId;
    }
}

let recordDir = './records';
try {
    fs.mkdirSync(recordDir);
} catch (err) {} // folder already exists

function writeRecordToFile(record, gameId) {
    let path = `${recordDir}/${gameId}.json.gz`;
    gzip(JSON.stringify(record)).then(compressed => {
        fs.writeFile(path, compressed, err => {
            if (err) {
                logger.error(err);
            } else {
                logger.info(`Saved game ${gameId} to ${path}`);
            }
        });
    });
    return path;
}

function writeRecordToDatabase(gameId, playerIds, startTime, savePath, collection) {
    let entry = {
        gameId: gameId,
        playerIds: playerIds,
        path: savePath,
        startTime: startTime,
        endTime: new Date()
    }
    collection.insertOne(entry)
        .then(result => {
            logger.info(`Inserted game ${gameId} with players ${JSON.stringify(playerIds)} into the database`);
        })
        .catch(err => {
            logger.error(err);
        });
}

module.exports = {recordInitial, recordUpdate, finishRecordAndSave};
