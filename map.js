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

function generateMap() {
    let corners = [
        [0, 0],
        [18, 0],
        [0, 18],
        [18, 18]
    ];

    let spawnChoices = [
        [1, 1],
        [17, 1],
        [1, 17],
        [17, 17]
    ];

    let towers = [
        [7, 7],
        [7, 11],
        [11, 7],
        [11, 11]
    ];

    let watchTowers = [
        [9, 9]
    ];

    let rivers = [
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

    let flagSpawns = [];
    for (let i=6; i<=12; i++) {
        for (let j=6; j<=12; j++) {
            if (!watchTowers.includes([i, j]) && !towers.includes([i, j])) {
                flagSpawns.push([i, j]);
            }
        }
    }

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
    let tempRivers;
    while(hasEnclosed) {
        console.log("inside");
        let tempRiverMaps = riverMaps;
        tempRivers = rivers;
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