var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

app.get('/', function (req, res) {
    res.send('Hello World!');
});

var wss = expressWs.getWss('/');

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
        console.log(`Received ${msg}`);
        ws.send(`Hello, you sent -> ${msg}`);
    });

    if (wss.clients.size <= 2) {
        ws.send(`You are Player ${wss.clients.size}`);
        console.log('size is', wss.clients.size);
    }
    else {
        ws.send(`Lobby is full`)
    }
});

app.listen(5000, function () {
    console.log('App listening on port 5000!');
});

// create a GET route
app.get('/express_backend', (req, res) => {
    res.send({express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT'});
});