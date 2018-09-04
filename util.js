const crypto = require('crypto');

const {UnitType} = require('./config');

function randString(length) {
    return crypto.randomBytes(length / 2).toString('hex');
}

class SquareState {
    constructor(options = {}) {
        Object.assign(this, {
            units: [],
            baseId: null,
            baseHP: 0,
            isFog: false
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

    peekUnitById(id) {
        for (let idx = 0; idx < this.units.length; idx++) {
            if (this.units[idx].id === id) {
                let temp = this.units[idx];
                return temp;
            }
        }
        return null;
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

module.exports = {randString, SquareState};