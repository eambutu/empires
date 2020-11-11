# Squarecraft: http://squarecraft.io
## Deployment Setup
1. Download Node and NPM from https://www.npmjs.com/get-npm. Run `sudo npm install nodemon -g` to install nodemon globally for development.
2. Install MongoDB from https://docs.mongodb.com/manual/administration/install-community/ and start the mongod process (e.g. `sudo systemctl start mongod`)
3. Change AWS security group's inbound rules to allow Custom TCP from 0.0.0.0 on ports 5000 (for the server).
4. To build the client, `cd client && npm install && node scripts/build.js && cd ..`
5. To run the server, `npm install && node index.js`

## Home Page
![Home](/resources/screenshots/home.png)

## Tutorial
![Tutorial](/resources/screenshots/tutorial.png)

## Game Queue
![Queue](/resources/screenshots/queue.png)

## Game
![Game](/resources/screenshots/game.png)

## Game Over
![Game Over](/resources/screenshots/game_over_defeat.png)

## Replay
![Replay](/resources/screenshots/replay.png)