const fs = require('fs');
const winston = require('winston');

const logdir = './logs';
try {
    fs.mkdirSync(logdir);
} catch (err) {
    // folder already exists
}

let fileOptions = {
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize()
    ),
    filename: logdir + '/app.log',
    handleExceptions: true,
    json: true,
    colorize: false
};

let consoleOptions = {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true
};

let logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.prettyPrint(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.File(fileOptions),
        new winston.transports.Console(consoleOptions)
    ],
    exitOnError: false
});

module.exports = logger;