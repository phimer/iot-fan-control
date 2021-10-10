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
app.use(bodyParser.urlencoded({ extended: true })); //delete maybe?

app.use(express.static('static', { index: '_' }));
app.set('view engine', 'ejs');




//extra
const path = require('path');
// const fs = require('fs');
const util = require('util');
const crypto = require('crypto');
const pbkdf2 = util.promisify(crypto.pbkdf2);


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
const userDataCollection = db.collection('user_data');
const userLoginCollection = db.collection('user_login_data');

const directory = path.join(__dirname, 'static');


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


//routings before authentication ++
app.get('/logout', async (req, res) => {

    console.log("logout")
    res.status(401).render('logout');

})

app.get('/', async (req, res) => {



    var authheader = req.headers.authorization;

    res.status(200).sendFile(path.join(directory, 'index.html'));

})

app.get('/createUser', async (req, res) => {
    res.status(200).sendFile(path.join(directory, 'createUser.html'));
})

app.post('/createUser', async (req, res) => {

    let user = req.body;

    console.log(`post user: ${user.name}`);


    let hashedPassword = await hash(user.password);
    user.password = hashedPassword;
    console.log("userpassword: " + user.password)
    console.log("user_name: " + user.name)


    const result = await userLoginCollection.insertOne({ user_name: user.name, password: user.password });
    console.log('Inserted documents =>', result);

    res.status(200).json(result);


})

//routings before authentication --




//Make sure that the middleware is declared before the routes to which the middleware should apply.

//authentication ++ 
async function authentication(req, res, next) {

    log("authentication function")


    var authheader = req.headers.authorization;

    if (!authheader) {

        console.log("no auth header");
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err)


    }


    var auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];



    if (await authenticateUser(user, pass) === true) {

        log(`user ${user} authenticated`)

        let loginTime = new Date();

        const result = await userDataCollection.insertOne({ user_name: user, login_time: loginTime });
        console.log('Inserted documents =>', result);


        next(); //calls next middleware function in the stack

    } else {


        log('user NOT authenticated')

        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err);
    }

}




// First step is the authentication of the client
app.use(authentication)



async function authenticateUser(userName, password) {


    let hashedPassword = await hash(password);

    const getUser = await userLoginCollection.find({ user_name: userName }).toArray();

    log(getUser)


    if (getUser[0] === undefined) {
        console.log("No user exists with that name")
        return false;
    }
    console.log("user password: " + getUser[0].password);

    if (getUser[0].password === hashedPassword) {
        console.log(`User: ${getUser[0].user_name} is authenticated - passwords match`);
        return true;
    } else {
        return false;
    }
}

async function hash(password) {

    const key = await pbkdf2(password, 'salt', 100000, 64, 'sha512').catch(err => console.log(err));
    console.log("key: " + key.toString('hex'))
    return key.toString('hex');



}
//authentication --




//routings after authentication ++
app.get('/fan-control', async (req, res) => {



    res.status(200).sendFile(path.join(directory, 'fanControl.html'));

})

//routings after authentication --






//websocket ++
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



//websocket --





//mongo get post
// app.get('/user', async (req, res) => {

//     const getAllUsers = await collection.find({}).toArray();
//     console.log('Found users: ', getAllUsers);

//     res.status(200).json(getAllUsers);

// })
// app.post('/user', async (req, res) => {

//     let user = req.body;
//     console.log(`post user: ${user.name} `);

//     const result = await collection.insertOne(user);
//     console.log('Inserted documents =>', result);

//     res.status(200).json(result);

// })







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
    console.log(`App listening at http://localhost:3000`)
})