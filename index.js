//websocket - send to socket outside of function
//https://github.com/websockets/ws/issues/367

//ws to all
//https://github.com/websockets/ws#server-broadcast

'use strict';

var log = console.log;

//essential
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('static'));



//extra
const path = require('path');
const fs = require('fs');
const util = require('util');
const crypto = require('crypto');
const pbkdf2 = util.promisify(crypto.pbkdf2);



//websocket
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });


wss.on("connection", async ws => {
    log("new client connected");


    ws.on("message", data => {

        let clientData = JSON.parse(data);

        log(data)
        log(clientData)


        let dataForFan = {};
        // { "auto": true, "pressure": 10 } `

        if (clientData.mode === 'auto') {
            log("pressure set by client: " + clientData.pressure);
            dataForFan.auto = true;
            dataForFan.pressure = clientData.pressure;
        } else if (clientData.mode === 'manual') {
            log("fan-speed set by client: " + clientData.fanSpeed);
            dataForFan.auto = false;
            dataForFan.speed = clientData.fanSpeed;
        }

        mqttClient.publish('controller/settings', JSON.stringify(dataForFan));
    })


    ws.on("close", () => {
        log("client has disconnected")
    })
})



//mqtt
var mqtt = require('mqtt')
var mqttClient = mqtt.connect('mqtt://127.0.0.1:1883')

mqttClient.on('connect', () => {
    mqttClient.subscribe('controller/status', err => {
        if (err) {
            log("Error. Subscribe to controller/status failed");
        }
    })
})


mqttClient.on('message', async (topic, message) => {

    let mqttData = JSON.parse(message.toString())

    log(mqttData)

    let date = new Date();

    mqttData.time = date;

    const result = await collection.insertOne(mqttData);
    console.log(`data saved to database`);


    wss.clients.forEach(async (client) => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(mqttData));

        }
    })


})








//mongo
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

const dbName = 'iot_project';
client.connect();
console.log('Connected successfully to database');
const db = client.db(dbName);
const collection = db.collection('fan_data');


const directory = path.join(__dirname, 'static');




//mongo get post
app.get('/user', async (req, res) => {

    const getAllUsers = await collection.find({}).toArray();
    console.log('Found users: ', getAllUsers);

    res.status(200).json(getAllUsers);

})
app.post('/user', async (req, res) => {

    let user = req.body;
    console.log(`post user: ${user.name} `);

    const result = await collection.insertOne(user);
    console.log('Inserted documents =>', result);

    res.status(200).json(result);

})



//error handling
app.use(function (req, res, next) {
    res.status(404);

    if (req.accepts('html')) {
        res.render('error', {
            data: {
                errorCode: "404",
            }
        })
    } else {
        res.send("ERROR 404");
    }
})



//appstart
app.listen(3000, () => {
    console.log(`Example app listening at http://localhost:3000}`)
})