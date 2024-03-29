'use strict';

const log = console.log;

//essential
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('static', { index: '_' }));
app.set('view engine', 'ejs');


//extra
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const pbkdf2 = util.promisify(crypto.pbkdf2);


//mongodb
const { MongoClient } = require('mongodb');

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
            log("Error - Subscribe to controller/status failed");
        }
    })
})


mqttClient.on('message', async (topic, message) => {

    const mqttData = JSON.parse(message.toString())


    const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);

    const dateSplits = localISOTime.split('T');

    mqttData.time = localISOTime;
    mqttData.day = dateSplits[0];
    mqttData.hour = parseInt(dateSplits[1].split(':')[0]);
    mqttData.minute = parseInt(dateSplits[1].split(':')[1]);
    log(mqttData)

    const result = await collection.insertOne(mqttData);
    console.log(`data saved to database\n`);


    const fanDataObj = {};
    fanDataObj.fanData = mqttData;
    fanDataObj.identifier = 'continous-data';


    wss.clients.forEach(async (client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(fanDataObj));
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



//routings before authentication --

//authentication ++ 
const authentication = async (req, res, next) => {

    const authheader = req.headers.authorization;

    if (!authheader) {

        console.log("no auth header");
        const err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err)


    }


    const auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];



    if (await authenticateUser(user, pass) === true) {

        log(`user ${user} authenticated`)



        next(); //calls next middleware function in the stack

    } else {


        log('user NOT authenticated')

        const err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err);
    }

}




// First step is the authentication of the client
app.use(authentication)



const authenticateUser = async (userName, password) => {


    const hashedPassword = await hash(password);

    const getUser = await userLoginCollection.find({ user_name: userName }).toArray();


    if (getUser[0] === undefined) {
        console.log("No user exists with that name")
        return false;
    }

    if (getUser[0].password === hashedPassword) {
        return true;
    } else {
        return false;
    }
}

const hash = async password => {

    const key = await pbkdf2(password, 'salt', 100000, 64, 'sha512').catch(err => console.log(err));
    return key.toString('hex');

}
//authentication --

// app.get('/createUser', async (req, res) => {
//     res.status(200).sendFile(path.join(directory, 'createUser.html'));
// })

// app.post('/createUser', async (req, res) => {

//     const user = req.body;

//     log(`post user: ${user.name}`);


//     const hashedPassword = await hash(user.password);
//     user.password = hashedPassword;
//     log("userpassword: " + user.password)
//     log("user_name: " + user.name)


//     const result = await userLoginCollection.insertOne({ user_name: user.name, password: user.password });


//     res.status(200).json(result);


// })


//routings after authentication ++
app.get('/fan-control', async (req, res) => {

    const authheader = req.headers.authorization;

    saveUserActivity(authheader, 'navigating fan-control page');

    res.status(200).sendFile(path.join(directory, 'fanControl.html'));

})

//routings after authentication --

//user stats ++ 
app.get('/user-stats', async (req, res) => {

    const authheader = req.headers.authorization;

    saveUserActivity(authheader, 'looking at user statistics');

    const userData = await userDataCollection.aggregate([
        {
            $group: {
                _id: "$user_name",
                loginTimes: {
                    "$push": {
                        loginTime: "$login_time",
                        activity: "$activity"
                    }
                }
            }
        }
    ]).toArray();


    userData.forEach((value, key) => {
        log(value._id);
        log(value.loginTimes[0])
        value.loginTimes.forEach((value2, key2) => {

            let date = new Date(value2.loginTime);
            // const options = { weekday }


            value2.loginTime = date.toLocaleString();

            //value2.loginTime = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

        })
    })

    res.status(200).render('userStats', {
        data: {
            userData: userData
        }
    });

})
//user stats --

//get routings to track user activity ++
app.get('/pressure', async (req, res) => {

    log('pressure')

    const authheader = req.headers.authorization;

    await saveUserActivity(authheader, 'adjusting pressure');

    res.status(200).send("ok");

})

app.get('/fan-speed', async (req, res) => {


    log('fan-speed')

    const authheader = req.headers.authorization;

    await saveUserActivity(authheader, 'adjusting fan-speed');
    res.status(200).send("ok");

})

app.get('/aggregate-data', async (req, res) => {

    // log("AGGGREGATE DATA")

    log('aggregate')

    const authheader = req.headers.authorization;

    await saveUserActivity(authheader, 'looking at aggregate data');
    res.status(200).send("ok");

})
//get routings to track user activity --


//websocket ++
const WebSocket = require("ws");
const { time } = require('console');
const wss = new WebSocket.Server({ port: 8080 });


wss.on("connection", async ws => {
    log("new client connected");


    //load 15 most recent from db
    const fifteenMostRecentDataPoints = await collection.find().limit(15).sort({ $natural: -1 }).toArray();

    const fanDataForInitialConnection = {};
    fanDataForInitialConnection.fanData = fifteenMostRecentDataPoints;
    fanDataForInitialConnection.identifier = 'initial-data';

    wss.clients.forEach(async (client) => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(fanDataForInitialConnection));
        }
    })


    ws.on("message", async data => {

        const clientData = JSON.parse(data);

        log(clientData)

        if (clientData.identifier === 'fan-data') {

            const dataForFan = {};

            log('dataForFan', clientData)

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


        } else if (clientData.identifier === 'time-period-data') {




            const dateStringStart = `2021-${await addLeadingZero(clientData.startMonth)}-${await addLeadingZero(clientData.startDay)}`;
            const dateStringEnd = `2021-${await addLeadingZero(clientData.endMonth)}-${await addLeadingZero(clientData.endDay)}`;

            log(`dateStringStart: ${dateStringStart}`)
            log(`dateStringEnd: ${dateStringEnd}`)

            const timeEndPlusOne = await addOneHourToHourMinuteString(clientData.timeEnd);
            log(timeEndPlusOne)


            const from = dateStringStart + 'T' + clientData.timeStart + ':00.000'
            log("from: " + from)

            const to = dateStringEnd + 'T' + timeEndPlusOne + ':00.000'
            log("to: " + to)

            const dataArray = await collection.aggregate([
                {
                    $match: {
                        "time": {
                            $gte: from,
                            $lt: to
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            day: "$day",
                            hour: "$hour",
                        },
                        speed: { $avg: "$speed" },
                        pressure: { $avg: "$pressure" },
                        firstDateInGroup: { $min: "$time" },
                        lastDateInGroup: { $max: "$time" },
                        firstHourDataPointInGroup: { $min: "$hour" },
                        lastHourDataPointInGroup: { $max: "$hour" },
                        firstMinuteDataPointInGroup: { $min: "$minute" },
                        lastMinuteDataPointInGroup: { $max: "$minute" },
                        time: { $min: "$time" },
                    }
                },
                {
                    $sort: { firstDateInGroup: 1, firstHourDataPointInGroup: 1, firstMinuteDataPointInGroup: 1 }
                }
            ]).toArray();

            // log("aggregated fanData From DB: ", dataArray);

            log(dataArray);

            const fanDataForTimePeriod = {};
            fanDataForTimePeriod.identifier = 'aggregate-data';
            fanDataForTimePeriod.fanData = dataArray;

            wss.clients.forEach(async (client) => {

                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(fanDataForTimePeriod));

                }
            })



        } else if (clientData.identifier === 'most-recent-data') {

            //send 15 most recent datapoints

            const numberOfDataPoints = clientData.numberOfDataPoints;

            //load 15 most recent from db
            const mostRecentDataPoints = await collection.find().limit(numberOfDataPoints).sort({ $natural: -1 }).toArray();


            const fanDataWithMostRecentDataPoints = {};
            fanDataWithMostRecentDataPoints.fanData = mostRecentDataPoints;
            fanDataWithMostRecentDataPoints.identifier = 'most-recent-data';

            wss.clients.forEach(async (client) => {

                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(fanDataWithMostRecentDataPoints));

                }
            })



        }

    })


    ws.on("close", () => {
        log("client has disconnected")
    })
})
//websocket --

//helper ++
const addOneHourToHourMinuteString = async (hourMinuteString) => {

    const splits = hourMinuteString.split(':');
    const hourPlusOne = (parseInt(splits[0]) + 1).toString();

    return `${await addLeadingZero(hourPlusOne)}:${splits[1]}`;
}

const saveUserActivity = async (authheader, activity) => {


    const auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    const user = auth[0];


    const loginTime = new Date();

    const result = await userDataCollection.insertOne({ user_name: user, login_time: loginTime, activity: activity });

}

const addLeadingZero = async (value) => {

    const result = (value < 10 ? '0' : '') + value;
    return result;

}
//helper --


//error handling
app.use((req, res, next) => {
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


