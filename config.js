module.exports = {
    SquareType: {
        UNKNOWN: 0,
        REGULAR: 1,
        BASE: 2,
        TOWER: 3,
        WATCHTOWER: 4,
        RIVER: 5
    },
    UnitType: {
        ATTACKER: 1,
        DEFENDER: 2,
    },
    Costs: {
        ATTACKER: 25,
        DEFENDER: 200,
    },
    Action: {
        MOVE_DOWN: "move_down",
        MOVE_UP: "move_up",
        MOVE_LEFT: "move_left",
        MOVE_RIGHT: "move_right"
    }
};
