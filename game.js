const {SquareType, UnitType, RoomType, Costs, HP} = require('./config');
var {generateMap} = require('./map');

const Vision = {
    UNIT: 1,
    BASE: 3,
    WATCHTOWER: 4,
};

var width;
var height;
const flagSpawnProbability = 0.002;
const flagWinNum = 20;
const framesPerMove = 2;

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

function initState(room, type) {
    let playerIds = room.clients.map(client => client.playerId);

    room.fogOfWar = true;
    if (type === RoomType.TUTORIAL) {
        room.fogOfWar = false;
        playerIds.push("cpu".toString())
    }

    let playerBases = {};
    let spawnSquares = {};
    let queues = {};
    let trimmed = {};
    let spawned = {};
    let shards = {};
    let flags = {};
    let height;
    let width;

    if (type === RoomType.CUSTOM) {
        height = 15;
        width = 15;
    } else {
        height = 19;
        width = 19;
    }

    let genMap = generateMap(type);
    console.log("here");

    let cornerMap = {};
    let remainingCornerIndices = [0, 1, 2, 3];
    if (type === RoomType.TUTORIAL) {
        cornerMap[playerIds[0]] = 2;
        cornerMap[playerIds[1]] = 0;
        remainingCornerIndices = [1, 3];
    } else { // randomly assign players to a corner index
        playerIds.forEach(playerId => {
            let randIndex = Math.floor(Math.random() * remainingCornerIndices.length);
            cornerMap[playerId] = remainingCornerIndices[randIndex];
            remainingCornerIndices.splice(randIndex, 1);
        });
    }

    playerIds.forEach(playerId => {
        // Initialize queue
        queues[playerId] = {
            spawn: [],
        };
        trimmed[playerId] = {};
        spawned[playerId] = false;
        let cornerIndex = cornerMap[playerId];
        playerBases[playerId] = genMap.corners[cornerIndex];
        spawnSquares[playerId] = genMap.spawnChoices[cornerIndex];
        shards[playerId] = 20;
        flags[playerId] = 0;
    });

    remainingCornerIndices.forEach(index => {
        genMap.towers.push(genMap.corners[index]);
    });

    let squareStates = [...Array(height)].map(y => {
        return [...Array(width)].map(x => {
            return new SquareState({pos: [y, x], type: SquareType.REGULAR});
        });
    });
    Object.entries(playerBases).forEach(([playerId, [y, x]]) => {
        if (type === RoomType.FFA) {
            squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.BASE, baseId: playerId, baseHP: 0});
        } else {
            squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.BASE, baseId: playerId, baseHP: 5});
        }
    });
    genMap.towers.forEach(([y, x]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.TOWER});
    });
    genMap.watchTowers.forEach(([y, x]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.WATCHTOWER});
    });
    genMap.rivers.forEach(([y, x]) => {
        squareStates[y][x] = new SquareState({pos: [y, x], type: SquareType.RIVER});
    });

    if (type === RoomType.TUTORIAL) {
        let realPlayerId = playerIds[0];
        shards[realPlayerId] = 1000;
        queues[realPlayerId]["spawn"] = [
            {
                "action": "spawn",
                "target": [1, 17],
                "type": UnitType.ATTACKER,
                "playerId": realPlayerId
            },
            {
                "action": "spawn",
                "target": [2, 16],
                "type": UnitType.DEFENDER,
                "playerId": realPlayerId
            }
        ];
        squareStates[8][8] = new SquareState({pos: [8, 8], type: SquareType.FLAG});
        squareStates[9][10] = new SquareState({pos: [9, 10], type: SquareType.FLAG});
    }

    room.playerIds = playerIds;
    room.playerBases = playerBases;
    room.spawnSquares = spawnSquares;
    room.squareStates = squareStates;
    room.shape = [height, width];
    room.flagSpawns = genMap.flagSpawns;
    room.queues = queues;
    room.trimmed = trimmed;
    room.spawned = spawned;
    room.shards = shards;
    room.flags = flags;
    room.towers = genMap.towers;
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
    const flags = room.flags;
    const queues = room.queues;
    const trimmed = room.trimmed;
    const spawned = room.spawned;
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
                playerStatus[client.playerId] = {'name': client.name, 'status': client.status};
            }
        });
    }

    let visibleSquares = squares;
    if (room.fogOfWar) {
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
        spawned: spawned[playerId],
        squares: visibleSquares,
        playerStatus: playerStatus,
        shards: shards[playerId],
        flags: flags
    };
}

function validateQueues(room) {
    Object.entries(room.queues).forEach(([playerId, unitQueues]) => {
        [spawnY, spawnX] = room.spawnSquares[playerId];
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

            let startingLength = queue.length;
            unitQueues[unitId] = queue.filter(move => {
                if (move.action.includes("move")) {
                    let [sY, sX] = move.source;
                    let [tY, tX] = move.target;
                    if (isPlayerAndUnit[sY][sX] && room.squareStates[tY][tX].type !== SquareType.RIVER) {
                        isPlayerAndUnit[sY][sX] = false;
                        isPlayerAndUnit[tY][tX] = true;
                        return true;
                    }
                }
                return false;
            });
            room.trimmed[playerId][unitId] = (room.trimmed[playerId][unitId] || (unitQueues[unitId].length !== startingLength));
        });
    });
}

function clearTrimmedAndSpawned(room) {
    Object.entries(room.trimmed).forEach(([playerId, playerTrimmed]) => {
        Object.keys(playerTrimmed).forEach(unitId => {
            room.trimmed[playerId][unitId] = false;
        });
    });
    Object.keys(room.spawned).forEach(playerId => {
        room.spawned[playerId] = false;
    });
}

function fetchSpawns(room) {
    let spawns = [];
    room.playerIds.forEach(playerId => {
        let unitQueue = room.queues[playerId]["spawn"];
        spawns.push.apply(spawns, unitQueue);
        unitQueue.length = 0;
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
                room.spawned[playerId] = true;
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
    if (room.frameCounter % framesPerMove === 0) {
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
            if (unitQueue.length > 0 && (room.frameCounter % framesPerMove === 0)) {
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
    let gameEnded = false;
    Object.entries(room.playerBases).forEach(([playerId, [y, x]]) => {
        let unit = room.squareStates[y][x].getUnit();
        if (unit && (unit.playerId !== playerId)) {
            if (unit.count >= room.squareStates[y][x].baseHP) {
                unit.count -= room.squareStates[y][x].baseHP;
                room.squareStates[y][x].baseHP = 0;

                let gameWonStatus = {};
                room.playerIds.forEach(playerId => {
                    if (playerId === unit.playerId) {
                        gameWonStatus[playerId] = "won";
                    } else {
                        gameWonStatus[playerId] = "lost";
                    }
                })
                room.gameWonStatus = gameWonStatus;
                gameEnded = true;
            } else {
                room.squareStates[y][x].baseHP -= unit.count;
                room.squareStates[y][x].units.length = 0;
            }
        }
    });
    return gameEnded;
}

function spawnFlags(room) {
    if (room.frameCounter % framesPerMove === 0) {
        room.flagSpawns.forEach(([y, x]) => {
            let square = room.squareStates[y][x];
            if (square.type === SquareType.REGULAR && square.currentOwner() === null) {
                if (Math.random() < flagSpawnProbability) {
                    square.type = SquareType.FLAG;
                }
            }
        })
    }
}

function updateFlagsAndCheckWin(room) {
    let gameEnded = false;
    // First, give flags to everyone who owns a flag square
    room.flagSpawns.forEach(([y, x]) => {
        let square = room.squareStates[y][x];
        if (square.type === SquareType.FLAG && square.currentOwner() !== null) {
            room.flags[square.currentOwner()]++;
            square.type = SquareType.REGULAR;
        }
    });

    // Take and give flags based on base ownership
    // A tie here is being broken based off of playerId
    if (room.frameCounter === 0) {
        Object.entries(room.playerBases).forEach(([playerId, [y, x]]) => {
            let unit = room.squareStates[y][x].getUnit();
            if (unit && (unit.playerId !== playerId)) {
                if (room.flags[playerId] > 0) {
                    room.flags[playerId]--;
                    room.flags[unit.playerId]++;
                    unit.count--;
                    if (unit.count <= 0) {
                        room.squareStates[y][x].units = [];
                    }
                }
            }
        });
    }

    Object.entries(room.flags).forEach(([playerId, numFlags]) => {
        if (numFlags >= flagWinNum) {
            let gameWonStatus = {};
            room.playerIds.forEach(tempPlayerId => {
                if (tempPlayerId === playerId) {
                    gameWonStatus[tempPlayerId] = "won";
                } else {
                    gameWonStatus[tempPlayerId] = "lost";
                }
            })
            room.gameWonStatus = gameWonStatus;
            gameEnded = true;
        }
    });
    return gameEnded;
}

function updateState(room, isFlag) {
    validateQueues(room);

    let spawns = fetchSpawns(room);
    addSpawns(room, spawns);

    let moves = fetchMoves(room);
    addMoves(room, moves);
    resolveConflicts(room, moves);

    validateQueues(room);

    incrementShards(room);

    let gameEnded;
    if (isFlag) {
        gameEnded = updateFlagsAndCheckWin(room);
        spawnFlags(room);
    } else {
        gameEnded = updateBasesAndCheckWin(room);
    }

    return gameEnded;
}

module.exports = {
    initState: initState,
    getState: getState,
    updateState: updateState,
    width: width,
    height: height,
    clearTrimmedAndSpawned: clearTrimmedAndSpawned
}