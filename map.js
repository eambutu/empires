const {RoomType, GameType} = require('./config');

class MapSchema {
    constructor(options = {}) {
        Object.assign(this, options);
    }
}

function isEnclosed(squaresMap) {
    let height = squaresMap.length;
    let width = squaresMap[0].length;
    let seen = [];
    for (let i=0; i<height; i++) {
        seen[i] = [];
        for (let j=0; j<width; j++) {
            seen[i][j] = false;
        }
    }
    let processQueue = [[0, 0]];
    while (processQueue.length > 0) {
        let [y, x] = processQueue.pop();
        seen[y][x] = true;
        if (y - 1 >= 0 && !squaresMap[y - 1][x] && !seen[y - 1][x]) {
            processQueue.push([y - 1, x]);
        }
        if (y + 1 < height && !squaresMap[y + 1][x] && !seen[y + 1][x]) {
            processQueue.push([y + 1, x]);
        }
        if (x - 1 >= 0 && !squaresMap[y][x - 1] && !seen[y][x - 1]) {
            processQueue.push([y, x - 1]);
        }
        if (x + 1 < width && !squaresMap[y][x + 1] && !seen[y][x + 1]) {
            processQueue.push([y, x + 1]);
        }
    }
    for (let i=0; i<height; i++) {
        for (let j=0; j<width; j++) {
            if (!squaresMap[i][j] && !seen[i][j]) {
                return true;
            }
        }
    }
    return false;
}

function generateMap(roomType, gameType) {
    let corners;
    let spawnChoices;
    let towers;
    let watchTowers;
    let rivers;
    let flagSpawns;
    let tempRivers

    if (gameType === GameType.DUEL) {
        corners = [
            [0, 0],
            [14, 0],
            [0, 14],
            [14, 14]
        ];
        spawnChoices = [
            [1, 1],
            [13, 1],
            [1, 13],
            [13, 13]
        ];
        towers = [
            [4, 4],
            [4, 10],
            [10, 4],
            [10, 10]
        ];
        watchTowers = [
            [7, 7]
        ];
        tempRivers = [
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
    } else {
        corners = [
            [0, 0],
            [18, 0],
            [0, 18],
            [18, 18]
        ];

        spawnChoices = [
            [1, 1],
            [17, 1],
            [1, 17],
            [17, 17]
        ];

        towers = [
            [7, 7],
            [7, 11],
            [11, 7],
            [11, 11]
        ];

        watchTowers = [
            [9, 9]
        ];

        rivers = [
            [0, 9],
            [1, 9],
            [2, 9],
            [16, 9],
            [17, 9],
            [18, 9],
            [9, 0],
            [9, 1],
            [9, 2],
            [9, 16],
            [9, 17],
            [9, 18]
        ];

        flagSpawns = [];
        for (let i=6; i<=12; i++) {
            for (let j=6; j<=12; j++) {
                if (!watchTowers.includes([i, j]) && !towers.includes([i, j])) {
                    flagSpawns.push([i, j]);
                }
            }
        }

        if (roomType === RoomType.TUTORIAL) {
            let hardcodedRivers = [
                [0, 6],
                [0, 12],
                [2, 4],
                [2, 8],
                [2, 10],
                [2, 12],
                [2, 17],
                [4, 8],
                [4, 16],
                [5, 0],
                [5, 5],
                [5, 7],
                [5, 17],
                [7, 16],
                [9, 3],
                [10, 0],
                [10, 2],
                [10, 4],
                [10, 16],
                [11, 16],
                [13, 1],
                [14, 1],
                [14, 10],
                [15, 5],
                [15, 13],
                [15, 16],
                [16, 18],
                [17, 16]
            ];

            let hardcodedTowers = [
                [3, 1],
                [3, 17],
                [6, 5],
                [6, 13],
                [12, 5],
                [12, 13],
                [15, 1],
                [15, 17]
            ];

            tempRivers = rivers.concat(hardcodedRivers);
            towers = towers.concat(hardcodedTowers);
        } else {
            let validTowerQuads = [];
            for (let i=3; i<=7; i++) {
                for (let j=0; j<i; j++) {
                    validTowerQuads.push([i, j]);
                }
            }
            let riverProb = 0.1;

            let randIdxs = [Math.floor(validTowerQuads.length * Math.random()), Math.floor(validTowerQuads.length * Math.random())];
            while (randIdxs[0] === randIdxs[1]) {
                randIdxs = [Math.floor(validTowerQuads.length * Math.random()), Math.floor(validTowerQuads.length * Math.random())];
            }
            for (let i=0; i<2; i++) {
                let towerPos = validTowerQuads[randIdxs[i]];
                towers.push(towerPos);
                towers.push([18 - towerPos[0], towerPos[1]]);
                towers.push([towerPos[0], 18 - towerPos[1]]);
                towers.push([18 - towerPos[0], 18 - towerPos[1]]);
            }

            let riverMaps = [];
            for (let i=0; i<19; i++) {
                riverMaps[i] = [];
                for (let j=0; j<19; j++) {
                    riverMaps[i][j] = false;
                }
            }
            rivers.forEach(([y, x]) => {
                riverMaps[y][x] = true;
            });

            let forbiddenSquares = [
                [0, 1],
                [1, 0],
                [0, 17],
                [1, 18],
                [17, 0],
                [18, 1],
                [17, 18],
                [18, 17]
            ];
            forbiddenSquares = forbiddenSquares.concat(corners.concat(spawnChoices.concat(towers.concat(watchTowers.concat(flagSpawns)))));
            let forbiddenSquaresMap = [];
            for (let i=0; i<19; i++) {
                forbiddenSquaresMap[i] = [];
                for (let j=0; j<19; j++) {
                    forbiddenSquaresMap[i][j] = false;
                }
            }
            forbiddenSquares.forEach(([y, x]) => {
                forbiddenSquaresMap[y][x] = true;
            });

            let hasEnclosed = true;
            tempRivers = [];
            while(hasEnclosed) {
                console.log("If you see this a million times, we're stuck in an infinite loop");
                let tempRiverMaps = [];
                for (let i=0; i<riverMaps.length; i++) {
                    tempRiverMaps[i] = riverMaps[i].slice();
                }
                for (let i=0; i<rivers.length; i++) {
                    tempRivers[i] = rivers[i].slice();
                }
                for (let i=0; i<19; i++) {
                    for (let j=0; j<19; j++) {
                        if (!forbiddenSquaresMap[i][j] && Math.random() < riverProb) {
                            tempRiverMaps[i][j] = true;
                            tempRivers.push([i, j]);
                        }
                    }
                }
                hasEnclosed = isEnclosed(tempRiverMaps);
            }
        }
    }

    return new MapSchema({
        corners: corners,
        spawnChoices: spawnChoices,
        towers: towers,
        watchTowers: watchTowers,
        rivers: tempRivers,
        flagSpawns: flagSpawns
    })
}

module.exports = {
    generateMap: generateMap,
}