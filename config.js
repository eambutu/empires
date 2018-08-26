module.exports = {
    SquareType: {
        UNKNOWN: 0,
        REGULAR: 1,
        BASE: 2,
        TOWER: 3,
        WATCHTOWER: 4,
        RIVER: 5,
        FLAG: 6,
    },
    UnitType: {
        ATTACKER: 1,
        DEFENDER: 2,
    },
    Costs: {
        ATTACKER: 25,
        DEFENDER: 100,
    },
    HP: {
        ATTACKER: 1,
        DEFENDER: 5,
    },
    Action: {
        MOVE_DOWN: "move_down",
        MOVE_UP: "move_up",
        MOVE_LEFT: "move_left",
        MOVE_RIGHT: "move_right"
    },
    playerSquareColors: ['red', 'blue', 'green', 'orange'],
    RoomType: {
        FFA: "ffa",
        CUSTOM: "custom",
        TUTORIAL: "tutorial"
    },
    GameType: {
        CTF: "ctf",
        DUEL: "duel"
    },
    ClientStatus: {
        CONNECTED: "connected",
        RECONNECTING: "reconnecting",
        DISCONNECTED: "disconnected"
    },
    ReadyType: {
        NOT_READY: 0,
        READY: 1
    }
};
