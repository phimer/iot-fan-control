//websocket - send to socket outside of function
//https://github.com/websockets/ws/issues/367

//ws to all
//https://github.com/websockets/ws#server-broadcast

'use strict';

var log = console.log;

//essential
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); //delete maybe?

app.use(express.static('static', { index: '_' }));
app.set('view engine', 'ejs');




//extra
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const pbkdf2 = util.promisify(crypto.pbkdf2);


//mongodb
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


    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);

    let dateSplits = localISOTime.split('T');
    // log("day:  " + dateSplits[0])

    // log("DATE: " + localISOTime);

    mqttData.time = localISOTime;
    mqttData.day = dateSplits[0];
    mqttData.hour = parseInt(dateSplits[1].split(':')[0]);
    mqttData.minute = parseInt(dateSplits[1].split(':')[1]);
    log(mqttData)

    const result = await collection.insertOne(mqttData);
    console.log(`data saved to database\n`);


    let fanDataObj = {};
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
    //console.log('Inserted documents =>', result);

    res.status(200).json(result);


})

//routings before authentication --


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

        //const result = await userDataCollection.insertOne({ user_name: user, login_time: loginTime });
        //console.log('Inserted documents =>', result);


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

    return true;

    let hashedPassword = await hash(password);

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

async function hash(password) {

    const key = await pbkdf2(password, 'salt', 100000, 64, 'sha512').catch(err => console.log(err));
    return key.toString('hex');

}
//authentication --



//routings after authentication ++
app.get('/fan-control', async (req, res) => {

    res.status(200).sendFile(path.join(directory, 'fanControl.html'));

})

//routings after authentication --

//user stats ++  //rapha
app.get('/user-stats', async (req, res) => {

    //const userData = await userDataCollection.find({}).toArray();

    const userData = JSON.parse('[{"_id":"61770c530a5bc518c92cab17","user_name":"user1","login_time":"2021-10-25T19:58:11.109Z"},{"_id":"61770c5a0a5bc518c92cab19","user_name":"user1","login_time":"2021-10-25T19:58:18.196Z"},{"_id":"61770c5b0a5bc518c92cab1a","user_name":"user1","login_time":"2021-10-25T19:58:19.781Z"},{"_id":"61770c5f0a5bc518c92cab1c","user_name":"user1","login_time":"2021-10-25T19:58:23.662Z"},{"_id":"61770c6c0a5bc518c92cab20","user_name":"user1","login_time":"2021-10-25T19:58:36.944Z"},{"_id":"61770c890a5bc518c92cab27","user_name":"user1","login_time":"2021-10-25T19:59:05.979Z"},{"_id":"61770ca40a5bc518c92cab2d","user_name":"user1","login_time":"2021-10-25T19:59:32.041Z"},{"_id":"61770d538c699a1f206f58cf","user_name":"user1","login_time":"2021-10-25T20:02:27.419Z"},{"_id":"61770d558c699a1f206f58d0","user_name":"user1","login_time":"2021-10-25T20:02:29.428Z"},{"_id":"61770d70d18b6832047b4bae","user_name":"user1","login_time":"2021-10-25T20:02:56.248Z"},{"_id":"61770d71d18b6832047b4baf","user_name":"user1","login_time":"2021-10-25T20:02:57.392Z"},{"_id":"61770d71d18b6832047b4bb0","user_name":"user1","login_time":"2021-10-25T20:02:57.820Z"},{"_id":"61770d72d18b6832047b4bb1","user_name":"user1","login_time":"2021-10-25T20:02:58.072Z"},{"_id":"61770d8d415c735dcb1bda29","user_name":"user1","login_time":"2021-10-25T20:03:25.825Z"},{"_id":"61770d8f415c735dcb1bda2a","user_name":"user1","login_time":"2021-10-25T20:03:27.701Z"},{"_id":"61770d90415c735dcb1bda2b","user_name":"user1","login_time":"2021-10-25T20:03:28.344Z"},{"_id":"61770d90415c735dcb1bda2c","user_name":"user1","login_time":"2021-10-25T20:03:28.567Z"},{"_id":"61770d90415c735dcb1bda2d","user_name":"user1","login_time":"2021-10-25T20:03:28.786Z"},{"_id":"61770d95d86edecf1a37cffe","user_name":"user1","login_time":"2021-10-25T20:03:33.056Z"},{"_id":"61770db61e568a9ef11c3c5f","user_name":"user1","login_time":"2021-10-25T20:04:06.802Z"},{"_id":"61770dddd15d3538adbe3981","user_name":"user1","login_time":"2021-10-25T20:04:45.807Z"},{"_id":"6177123b8096eee50b7fd2cf","user_name":"user1","login_time":"2021-10-25T20:23:23.160Z"},{"_id":"617712bbd94eb095c3672423","user_name":"user1","login_time":"2021-10-25T20:25:31.228Z"},{"_id":"617712c6c9604d99f1f86708","user_name":"user1","login_time":"2021-10-25T20:25:42.348Z"},{"_id":"617712cdc9604d99f1f8670a","user_name":"user1","login_time":"2021-10-25T20:25:49.262Z"},{"_id":"61771384c9604d99f1f86730","user_name":"user1","login_time":"2021-10-25T20:28:52.882Z"},{"_id":"6177139ab6cdcd58306d1f8b","user_name":"user1","login_time":"2021-10-25T20:29:14.231Z"},{"_id":"6177157eb6cdcd58306d1fed","user_name":"user1","login_time":"2021-10-25T20:37:18.451Z"},{"_id":"6177163dc779e06349d46769","user_name":"user1","login_time":"2021-10-25T20:40:29.145Z"},{"_id":"6177164d785ed62eaf54bb00","user_name":"user1","login_time":"2021-10-25T20:40:45.070Z"},{"_id":"61771650785ed62eaf54bb02","user_name":"user1","login_time":"2021-10-25T20:40:48.335Z"},{"_id":"617716e78bdfe7b1f6d5d6ab","user_name":"user1","login_time":"2021-10-25T20:43:19.349Z"},{"_id":"617716f307bcfe006a9dd868","user_name":"user1","login_time":"2021-10-25T20:43:31.160Z"},{"_id":"617717196c969c39a9f13555","user_name":"user1","login_time":"2021-10-25T20:44:09.142Z"},{"_id":"61771908dba9e5004efbf42b","user_name":"user1","login_time":"2021-10-25T20:52:24.966Z"},{"_id":"6177190b53abfd8152d20ec5","user_name":"user1","login_time":"2021-10-25T20:52:27.778Z"},{"_id":"6177194e987c8115b1901ffe","user_name":"user1","login_time":"2021-10-25T20:53:34.467Z"},{"_id":"6177194e987c8115b1901fff","user_name":"user1","login_time":"2021-10-25T20:53:34.618Z"},{"_id":"6177195b859f7e177cf892fd","user_name":"user1","login_time":"2021-10-25T20:53:47.845Z"},{"_id":"6177199b6a195950ba358d1d","user_name":"user1","login_time":"2021-10-25T20:54:51.900Z"},{"_id":"617719c044dd79c70ea5fb4b","user_name":"user1","login_time":"2021-10-25T20:55:28.125Z"},{"_id":"6177c2fb83e464cc7b4b0b97","user_name":"user2","login_time":"2021-10-26T08:57:31.449Z"},{"_id":"6177c2fb83e464cc7b4b0b98","user_name":"user2","login_time":"2021-10-26T08:57:31.724Z"},{"_id":"6177c30283e464cc7b4b0b99","user_name":"user2","login_time":"2021-10-26T08:57:38.354Z"},{"_id":"6177c3b483e464cc7b4b0b9a","user_name":"user2","login_time":"2021-10-26T09:00:36.509Z"},{"_id":"6177c3dc83e464cc7b4b0b9b","user_name":"user2","login_time":"2021-10-26T09:01:16.132Z"},{"_id":"6177c41383e464cc7b4b0b9c","user_name":"user2","login_time":"2021-10-26T09:02:11.761Z"},{"_id":"6177c42643611abced8f478b","user_name":"user2","login_time":"2021-10-26T09:02:30.417Z"},{"_id":"6177c934693350c43d2a87b9","user_name":"user2","login_time":"2021-10-26T09:24:04.174Z"},{"_id":"6177c93f693350c43d2a87bc","user_name":"user1","login_time":"2021-10-26T09:24:15.977Z"},{"_id":"6177cb862a0aaa67187b2c58","user_name":"user1","login_time":"2021-10-26T09:33:58.630Z"},{"_id":"6179529f79c2109d3d7f2daf","user_name":"user2","login_time":"2021-10-27T13:22:39.203Z"},{"_id":"6179529f79c2109d3d7f2db0","user_name":"user2","login_time":"2021-10-27T13:22:39.474Z"},{"_id":"617955d33db9bab9a1e0b958","user_name":"user2","login_time":"2021-10-27T13:36:19.577Z"},{"_id":"617955f33db9bab9a1e0b960","user_name":"user2","login_time":"2021-10-27T13:36:51.812Z"},{"_id":"617955f83db9bab9a1e0b962","user_name":"user2","login_time":"2021-10-27T13:36:56.549Z"},{"_id":"617956bc3db9bab9a1e0b98a","user_name":"user2","login_time":"2021-10-27T13:40:12.141Z"},{"_id":"617956c03db9bab9a1e0b98c","user_name":"user2","login_time":"2021-10-27T13:40:16.956Z"},{"_id":"617956cf3db9bab9a1e0b990","user_name":"user2","login_time":"2021-10-27T13:40:31.656Z"},{"_id":"617958c83db9bab9a1e0b9f6","user_name":"user2","login_time":"2021-10-27T13:48:56.291Z"},{"_id":"617958f43db9bab9a1e0b9ff","user_name":"user2","login_time":"2021-10-27T13:49:40.294Z"},{"_id":"617958fc3db9bab9a1e0ba02","user_name":"user2","login_time":"2021-10-27T13:49:48.202Z"},{"_id":"6179591a3db9bab9a1e0ba09","user_name":"user2","login_time":"2021-10-27T13:50:18.381Z"},{"_id":"617959373db9bab9a1e0ba10","user_name":"user2","login_time":"2021-10-27T13:50:47.340Z"},{"_id":"617959403db9bab9a1e0ba13","user_name":"user2","login_time":"2021-10-27T13:50:56.460Z"},{"_id":"617959563db9bab9a1e0ba18","user_name":"user2","login_time":"2021-10-27T13:51:18.816Z"},{"_id":"617959cf3db9bab9a1e0ba31","user_name":"user2","login_time":"2021-10-27T13:53:19.120Z"},{"_id":"617959df3db9bab9a1e0ba35","user_name":"user2","login_time":"2021-10-27T13:53:35.818Z"},{"_id":"61795a023db9bab9a1e0ba3d","user_name":"user2","login_time":"2021-10-27T13:54:10.131Z"},{"_id":"61795a193db9bab9a1e0ba43","user_name":"user2","login_time":"2021-10-27T13:54:33.579Z"},{"_id":"61795a243db9bab9a1e0ba46","user_name":"user2","login_time":"2021-10-27T13:54:44.347Z"},{"_id":"61795a473db9bab9a1e0ba4e","user_name":"user2","login_time":"2021-10-27T13:55:19.466Z"},{"_id":"61795a703db9bab9a1e0ba57","user_name":"user2","login_time":"2021-10-27T13:56:00.198Z"},{"_id":"61795a943db9bab9a1e0ba60","user_name":"user2","login_time":"2021-10-27T13:56:36.452Z"},{"_id":"61795aa53db9bab9a1e0ba64","user_name":"user2","login_time":"2021-10-27T13:56:53.774Z"},{"_id":"61795aae3db9bab9a1e0ba67","user_name":"user2","login_time":"2021-10-27T13:57:02.302Z"},{"_id":"61795ab53db9bab9a1e0ba69","user_name":"user2","login_time":"2021-10-27T13:57:09.288Z"},{"_id":"61795ae13db9bab9a1e0ba73","user_name":"user2","login_time":"2021-10-27T13:57:53.613Z"},{"_id":"61795b103db9bab9a1e0ba7d","user_name":"user2","login_time":"2021-10-27T13:58:40.664Z"},{"_id":"61795b143db9bab9a1e0ba7f","user_name":"user2","login_time":"2021-10-27T13:58:44.563Z"},{"_id":"61795b183db9bab9a1e0ba81","user_name":"user2","login_time":"2021-10-27T13:58:48.843Z"},{"_id":"61795b1f3db9bab9a1e0ba83","user_name":"user2","login_time":"2021-10-27T13:58:55.313Z"},{"_id":"61795b383db9bab9a1e0ba89","user_name":"user2","login_time":"2021-10-27T13:59:20.889Z"},{"_id":"61795b443db9bab9a1e0ba8d","user_name":"user2","login_time":"2021-10-27T13:59:32.116Z"},{"_id":"61795bb63db9bab9a1e0baa5","user_name":"user2","login_time":"2021-10-27T14:01:26.170Z"},{"_id":"61795c673db9bab9a1e0bac9","user_name":"user2","login_time":"2021-10-27T14:04:23.583Z"},{"_id":"61795c9cf15332c00e8de771","user_name":"user2","login_time":"2021-10-27T14:05:16.653Z"},{"_id":"61795ce2f15332c00e8de780","user_name":"user2","login_time":"2021-10-27T14:06:26.902Z"},{"_id":"61795ceef15332c00e8de783","user_name":"user2","login_time":"2021-10-27T14:06:38.151Z"},{"_id":"61795cf9f15332c00e8de786","user_name":"user2","login_time":"2021-10-27T14:06:49.619Z"},{"_id":"61795d38f15332c00e8de794","user_name":"user2","login_time":"2021-10-27T14:07:52.544Z"},{"_id":"61795d5ef15332c00e8de79c","user_name":"user2","login_time":"2021-10-27T14:08:30.199Z"},{"_id":"61795d6af15332c00e8de7a0","user_name":"user2","login_time":"2021-10-27T14:08:42.021Z"},{"_id":"61795d6ff15332c00e8de7a2","user_name":"user2","login_time":"2021-10-27T14:08:47.619Z"},{"_id":"61795d73f15332c00e8de7a3","user_name":"user2","login_time":"2021-10-27T14:08:51.047Z"},{"_id":"61795d7ff15332c00e8de7a7","user_name":"user2","login_time":"2021-10-27T14:09:03.523Z"},{"_id":"61795d88f15332c00e8de7aa","user_name":"user2","login_time":"2021-10-27T14:09:12.605Z"},{"_id":"61795ea2f15332c00e8de7e3","user_name":"user2","login_time":"2021-10-27T14:13:54.249Z"},{"_id":"61795eaff15332c00e8de7e7","user_name":"user2","login_time":"2021-10-27T14:14:07.608Z"},{"_id":"61795ebcf15332c00e8de7ea","user_name":"user2","login_time":"2021-10-27T14:14:20.722Z"},{"_id":"61796001f15332c00e8de82c","user_name":"user2","login_time":"2021-10-27T14:19:45.481Z"},{"_id":"61796017f15332c00e8de832","user_name":"user2","login_time":"2021-10-27T14:20:07.272Z"},{"_id":"61796023f15332c00e8de835","user_name":"user2","login_time":"2021-10-27T14:20:19.031Z"},{"_id":"61796029f15332c00e8de837","user_name":"user2","login_time":"2021-10-27T14:20:25.625Z"},{"_id":"61796092f15332c00e8de84d","user_name":"user2","login_time":"2021-10-27T14:22:10.184Z"},{"_id":"61796097f15332c00e8de84f","user_name":"user2","login_time":"2021-10-27T14:22:15.680Z"},{"_id":"6179609cf15332c00e8de851","user_name":"user2","login_time":"2021-10-27T14:22:20.699Z"},{"_id":"61796128f15332c00e8de86e","user_name":"user2","login_time":"2021-10-27T14:24:40.318Z"},{"_id":"61796138f15332c00e8de873","user_name":"user2","login_time":"2021-10-27T14:24:56.772Z"},{"_id":"617961e1f15332c00e8de895","user_name":"user2","login_time":"2021-10-27T14:27:45.236Z"},{"_id":"617961e4f15332c00e8de897","user_name":"user2","login_time":"2021-10-27T14:27:48.755Z"},{"_id":"617961e7f15332c00e8de899","user_name":"user2","login_time":"2021-10-27T14:27:51.917Z"},{"_id":"617961f3f15332c00e8de89c","user_name":"user2","login_time":"2021-10-27T14:28:03.227Z"},{"_id":"6179622bf15332c00e8de8a8","user_name":"user2","login_time":"2021-10-27T14:28:59.356Z"},{"_id":"61796232f15332c00e8de8ab","user_name":"user2","login_time":"2021-10-27T14:29:06.823Z"},{"_id":"61796238f15332c00e8de8ad","user_name":"user2","login_time":"2021-10-27T14:29:12.806Z"},{"_id":"6179625ff15332c00e8de8b5","user_name":"user2","login_time":"2021-10-27T14:29:51.024Z"},{"_id":"61796263f15332c00e8de8b7","user_name":"user2","login_time":"2021-10-27T14:29:55.868Z"},{"_id":"61796267f15332c00e8de8b9","user_name":"user2","login_time":"2021-10-27T14:29:59.730Z"},{"_id":"6179626bf15332c00e8de8bb","user_name":"user2","login_time":"2021-10-27T14:30:03.361Z"},{"_id":"61796280f15332c00e8de8c0","user_name":"user2","login_time":"2021-10-27T14:30:24.335Z"},{"_id":"6179628bf15332c00e8de8c3","user_name":"user2","login_time":"2021-10-27T14:30:35.008Z"},{"_id":"61796291f15332c00e8de8c5","user_name":"user2","login_time":"2021-10-27T14:30:41.065Z"},{"_id":"617962bbaccde27480f5da8d","user_name":"user2","login_time":"2021-10-27T14:31:23.031Z"},{"_id":"6179633ab01d5e06be46bcaa","user_name":"user2","login_time":"2021-10-27T14:33:30.266Z"},{"_id":"61796369b01d5e06be46bcb5","user_name":"user2","login_time":"2021-10-27T14:34:17.272Z"},{"_id":"61796371b01d5e06be46bcb7","user_name":"user2","login_time":"2021-10-27T14:34:25.218Z"},{"_id":"617964b7b01d5e06be46bcfa","user_name":"user2","login_time":"2021-10-27T14:39:51.573Z"},{"_id":"617964c3b01d5e06be46bcfd","user_name":"user2","login_time":"2021-10-27T14:40:03.520Z"},{"_id":"617964dcb01d5e06be46bd03","user_name":"user2","login_time":"2021-10-27T14:40:28.172Z"},{"_id":"617964e0b01d5e06be46bd05","user_name":"user2","login_time":"2021-10-27T14:40:32.465Z"},{"_id":"6179651bb01d5e06be46bd12","user_name":"user2","login_time":"2021-10-27T14:41:31.615Z"},{"_id":"61796533b01d5e06be46bd17","user_name":"user2","login_time":"2021-10-27T14:41:55.661Z"},{"_id":"6179653ab01d5e06be46bd1a","user_name":"user2","login_time":"2021-10-27T14:42:02.777Z"},{"_id":"61796573b01d5e06be46bd26","user_name":"user2","login_time":"2021-10-27T14:42:59.676Z"},{"_id":"617966ebb01d5e06be46bd72","user_name":"user2","login_time":"2021-10-27T14:49:15.203Z"},{"_id":"617966f0b01d5e06be46bd74","user_name":"user2","login_time":"2021-10-27T14:49:20.664Z"},{"_id":"617966f5b01d5e06be46bd76","user_name":"user2","login_time":"2021-10-27T14:49:25.300Z"},{"_id":"617966fcb01d5e06be46bd79","user_name":"user2","login_time":"2021-10-27T14:49:32.989Z"},{"_id":"61796704b01d5e06be46bd7b","user_name":"user2","login_time":"2021-10-27T14:49:40.504Z"},{"_id":"617967bbb01d5e06be46bda1","user_name":"user2","login_time":"2021-10-27T14:52:43.134Z"},{"_id":"617967c4b01d5e06be46bda4","user_name":"user2","login_time":"2021-10-27T14:52:52.050Z"},{"_id":"617967deb01d5e06be46bdaa","user_name":"user2","login_time":"2021-10-27T14:53:18.402Z"},{"_id":"617967f1b01d5e06be46bdaf","user_name":"user2","login_time":"2021-10-27T14:53:37.580Z"},{"_id":"617967f8b01d5e06be46bdb1","user_name":"user2","login_time":"2021-10-27T14:53:44.659Z"},{"_id":"61796870b01d5e06be46bdca","user_name":"user2","login_time":"2021-10-27T14:55:44.448Z"},{"_id":"61796871b01d5e06be46bdcb","user_name":"user2","login_time":"2021-10-27T14:55:45.251Z"},{"_id":"61796876b01d5e06be46bdcd","user_name":"user2","login_time":"2021-10-27T14:55:50.253Z"},{"_id":"617968a46075fdb87f9ffc75","user_name":"user2","login_time":"2021-10-27T14:56:36.721Z"},{"_id":"617968df1401f644d1345d32","user_name":"user2","login_time":"2021-10-27T14:57:35.284Z"},{"_id":"6179698f60874e86fdf81a21","user_name":"user2","login_time":"2021-10-27T15:00:31.215Z"},{"_id":"617969a660874e86fdf81a27","user_name":"user2","login_time":"2021-10-27T15:00:54.683Z"},{"_id":"617969e865bb53cc9b4f1006","user_name":"user2","login_time":"2021-10-27T15:02:00.729Z"},{"_id":"617969f1f48bbd76fda8b8dd","user_name":"user2","login_time":"2021-10-27T15:02:09.814Z"},{"_id":"617969f4120b58ec0aa762e1","user_name":"user2","login_time":"2021-10-27T15:02:12.328Z"},{"_id":"61796a01120b58ec0aa762e4","user_name":"user2","login_time":"2021-10-27T15:02:25.305Z"},{"_id":"61796a02120b58ec0aa762e5","user_name":"user2","login_time":"2021-10-27T15:02:26.155Z"},{"_id":"61796a1d120b58ec0aa762ec","user_name":"user2","login_time":"2021-10-27T15:02:53.161Z"},{"_id":"6179771ca17a1d826ab9466f","user_name":"user2","login_time":"2021-10-27T15:58:20.225Z"},{"_id":"617977704b70be0adc16f38c","user_name":"user2","login_time":"2021-10-27T15:59:44.573Z"},{"_id":"617977724b70be0adc16f38d","user_name":"user2","login_time":"2021-10-27T15:59:46.059Z"},{"_id":"61797783c23c3622dd1118ed","user_name":"user2","login_time":"2021-10-27T16:00:03.141Z"},{"_id":"6179778dc23c3622dd1118f0","user_name":"user2","login_time":"2021-10-27T16:00:13.251Z"},{"_id":"61797804b60168bcf99d8add","user_name":"user2","login_time":"2021-10-27T16:02:12.582Z"},{"_id":"6179781bf99d667cb0e73c0f","user_name":"user2","login_time":"2021-10-27T16:02:35.201Z"},{"_id":"61797822f99d667cb0e73c12","user_name":"user2","login_time":"2021-10-27T16:02:42.541Z"},{"_id":"617978d0602346c3e82c785e","user_name":"user2","login_time":"2021-10-27T16:05:36.750Z"},{"_id":"617978d2602346c3e82c7860","user_name":"user2","login_time":"2021-10-27T16:05:38.601Z"},{"_id":"617978f4d9659e65fd88cdfa","user_name":"user2","login_time":"2021-10-27T16:06:12.725Z"},{"_id":"61797957c13e3843eddf64ee","user_name":"user2","login_time":"2021-10-27T16:07:51.490Z"},{"_id":"61797972b8cd146593a58c48","user_name":"user2","login_time":"2021-10-27T16:08:18.880Z"},{"_id":"61797a0d5685dde44aa0d5ed","user_name":"user2","login_time":"2021-10-27T16:10:53.257Z"},{"_id":"61797a385685dde44aa0d5f6","user_name":"user2","login_time":"2021-10-27T16:11:36.602Z"},{"_id":"61797a535685dde44aa0d5fd","user_name":"user2","login_time":"2021-10-27T16:12:03.543Z"},{"_id":"61797a6b5685dde44aa0d603","user_name":"user2","login_time":"2021-10-27T16:12:27.761Z"},{"_id":"61797a725685dde44aa0d605","user_name":"user2","login_time":"2021-10-27T16:12:34.719Z"},{"_id":"61797a825685dde44aa0d609","user_name":"user2","login_time":"2021-10-27T16:12:50.787Z"},{"_id":"61797a895685dde44aa0d60c","user_name":"user2","login_time":"2021-10-27T16:12:57.426Z"},{"_id":"61797a9e5685dde44aa0d611","user_name":"user2","login_time":"2021-10-27T16:13:18.765Z"},{"_id":"61797aab5685dde44aa0d614","user_name":"user2","login_time":"2021-10-27T16:13:31.788Z"},{"_id":"61797ab55685dde44aa0d617","user_name":"user2","login_time":"2021-10-27T16:13:41.159Z"},{"_id":"61797abb5685dde44aa0d619","user_name":"user2","login_time":"2021-10-27T16:13:47.062Z"},{"_id":"61797abf5685dde44aa0d61b","user_name":"user2","login_time":"2021-10-27T16:13:51.229Z"},{"_id":"61797ac55685dde44aa0d61e","user_name":"user2","login_time":"2021-10-27T16:13:57.283Z"},{"_id":"61797ae55685dde44aa0d625","user_name":"user2","login_time":"2021-10-27T16:14:29.624Z"},{"_id":"61797b1f5685dde44aa0d632","user_name":"user2","login_time":"2021-10-27T16:15:27.561Z"},{"_id":"61797b335685dde44aa0d637","user_name":"user2","login_time":"2021-10-27T16:15:47.296Z"},{"_id":"61797b44d62bbb2ea369d212","user_name":"user2","login_time":"2021-10-27T16:16:04.926Z"},{"_id":"61797b5f2ff58c7405cc5d0c","user_name":"user2","login_time":"2021-10-27T16:16:31.133Z"},{"_id":"61797b74b7af61f56ab81061","user_name":"user2","login_time":"2021-10-27T16:16:52.447Z"},{"_id":"61797e32b7af61f56ab810ee","user_name":"admin","login_time":"2021-10-27T16:28:34.312Z"},{"_id":"61797e35b7af61f56ab810f0","user_name":"admin","login_time":"2021-10-27T16:28:37.818Z"},{"_id":"61798089a399bc518893860f","user_name":"admin","login_time":"2021-10-27T16:38:33.621Z"},{"_id":"61798150ec5901ffd57f9dd8","user_name":"admin","login_time":"2021-10-27T16:41:52.919Z"},{"_id":"617982d9091322c4fd5e622e","user_name":"admin","login_time":"2021-10-27T16:48:25.307Z"},{"_id":"617983fb091322c4fd5e6269","user_name":"admin","login_time":"2021-10-27T16:53:15.032Z"},{"_id":"617984181b6d8446eaed844f","user_name":"admin","login_time":"2021-10-27T16:53:44.279Z"},{"_id":"6179844ec9507ea73aca7662","user_name":"admin","login_time":"2021-10-27T16:54:38.413Z"},{"_id":"61798453e0460b5c04174a38","user_name":"admin","login_time":"2021-10-27T16:54:43.324Z"},{"_id":"6179846c0b691dacfb160869","user_name":"admin","login_time":"2021-10-27T16:55:08.219Z"},{"_id":"61798479281fa5c2b3026540","user_name":"admin","login_time":"2021-10-27T16:55:21.554Z"},{"_id":"6179847fd062c5bfdaa2f45a","user_name":"admin","login_time":"2021-10-27T16:55:27.970Z"},{"_id":"617984889266ed8ada22495d","user_name":"admin","login_time":"2021-10-27T16:55:36.436Z"},{"_id":"617984974e36a9ca3add7822","user_name":"admin","login_time":"2021-10-27T16:55:51.236Z"},{"_id":"6179849fe7645475a0a20c01","user_name":"admin","login_time":"2021-10-27T16:55:59.255Z"},{"_id":"617984d0e7645475a0a20c0c","user_name":"admin","login_time":"2021-10-27T16:56:48.572Z"},{"_id":"617984dde7645475a0a20c0f","user_name":"admin","login_time":"2021-10-27T16:57:01.594Z"},{"_id":"617984f5e7645475a0a20c15","user_name":"admin","login_time":"2021-10-27T16:57:25.719Z"},{"_id":"617984f6e7645475a0a20c16","user_name":"admin","login_time":"2021-10-27T16:57:26.328Z"},{"_id":"61798509e7645475a0a20c1b","user_name":"admin","login_time":"2021-10-27T16:57:45.417Z"},{"_id":"6179850ce7645475a0a20c1d","user_name":"admin","login_time":"2021-10-27T16:57:48.869Z"},{"_id":"6179850de7645475a0a20c1e","user_name":"admin","login_time":"2021-10-27T16:57:49.297Z"},{"_id":"61798514e7645475a0a20c20","user_name":"admin","login_time":"2021-10-27T16:57:56.172Z"},{"_id":"61798518e7645475a0a20c22","user_name":"admin","login_time":"2021-10-27T16:58:00.469Z"},{"_id":"61798534e7645475a0a20c29","user_name":"admin","login_time":"2021-10-27T16:58:28.003Z"},{"_id":"61798534e7645475a0a20c2a","user_name":"admin","login_time":"2021-10-27T16:58:28.694Z"},{"_id":"61798539e7645475a0a20c2c","user_name":"admin","login_time":"2021-10-27T16:58:33.093Z"},{"_id":"6179853ae7645475a0a20c2d","user_name":"admin","login_time":"2021-10-27T16:58:34.223Z"},{"_id":"6179853ee7645475a0a20c2f","user_name":"admin","login_time":"2021-10-27T16:58:38.952Z"},{"_id":"61798544e7645475a0a20c31","user_name":"admin","login_time":"2021-10-27T16:58:44.388Z"},{"_id":"61798558e7645475a0a20c36","user_name":"admin","login_time":"2021-10-27T16:59:04.769Z"},{"_id":"6179856ce7645475a0a20c3b","user_name":"admin","login_time":"2021-10-27T16:59:24.988Z"},{"_id":"617985a7e7645475a0a20c48","user_name":"admin","login_time":"2021-10-27T17:00:23.200Z"},{"_id":"617985cae7645475a0a20c50","user_name":"admin","login_time":"2021-10-27T17:00:58.734Z"},{"_id":"617985d2e7645475a0a20c52","user_name":"admin","login_time":"2021-10-27T17:01:06.223Z"},{"_id":"617986e0e46154806d00cea6","user_name":"admin","login_time":"2021-10-27T17:05:36.470Z"},{"_id":"617986f11689efe308688679","user_name":"admin","login_time":"2021-10-27T17:05:53.259Z"},{"_id":"61798724fb89b6daff4ecd7b","user_name":"admin","login_time":"2021-10-27T17:06:44.757Z"},{"_id":"6179873a4b5c18a4a256aabb","user_name":"admin","login_time":"2021-10-27T17:07:06.763Z"},{"_id":"61798758121c14de9ad0b7c9","user_name":"admin","login_time":"2021-10-27T17:07:36.482Z"},{"_id":"6179877d6e75c74ac30787cf","user_name":"admin","login_time":"2021-10-27T17:08:13.889Z"},{"_id":"6179879d2ef68c0dc5f95729","user_name":"admin","login_time":"2021-10-27T17:08:45.317Z"},{"_id":"617987be5a8670000587dcec","user_name":"admin","login_time":"2021-10-27T17:09:18.932Z"},{"_id":"617987f45bfc617916164064","user_name":"admin","login_time":"2021-10-27T17:10:12.992Z"},{"_id":"617987f75bfc617916164065","user_name":"admin","login_time":"2021-10-27T17:10:15.523Z"},{"_id":"61798801fe351b3ed6ce2238","user_name":"admin","login_time":"2021-10-27T17:10:25.817Z"},{"_id":"6179880d8e1eb50d244201b3","user_name":"admin","login_time":"2021-10-27T17:10:37.342Z"},{"_id":"617989557812b4f982b3df99","user_name":"admin","login_time":"2021-10-27T17:16:05.964Z"},{"_id":"6179898e73641b228e83b4c5","user_name":"admin","login_time":"2021-10-27T17:17:02.298Z"},{"_id":"6179899773641b228e83b4c8","user_name":"admin","login_time":"2021-10-27T17:17:11.304Z"},{"_id":"61798a62ac192d80ae422be7","user_name":"admin","login_time":"2021-10-27T17:20:34.408Z"},{"_id":"61798c18ba162bf4422f979b","user_name":"admin","login_time":"2021-10-27T17:27:52.409Z"},{"_id":"617a54962d08a2fd3e8f6422","user_name":"admin","login_time":"2021-10-28T07:43:18.689Z"},{"_id":"617a54962d08a2fd3e8f6423","user_name":"admin","login_time":"2021-10-28T07:43:18.985Z"},{"_id":"617a54ca2d08a2fd3e8f642e","user_name":"admin","login_time":"2021-10-28T07:44:10.813Z"},{"_id":"617a54e02d08a2fd3e8f6434","user_name":"admin","login_time":"2021-10-28T07:44:32.650Z"},{"_id":"617a58f704dfa5747841bfa6","user_name":"admin","login_time":"2021-10-28T08:01:59.225Z"},{"_id":"617a5971f09f3ec7198c7d46","user_name":"admin","login_time":"2021-10-28T08:04:01.846Z"},{"_id":"617a597ff09f3ec7198c7d49","user_name":"admin","login_time":"2021-10-28T08:04:15.175Z"},{"_id":"617a59eb65c0c4797965bdc1","user_name":"admin","login_time":"2021-10-28T08:06:03.581Z"},{"_id":"617a5a2bd6860133ccd9d7cf","user_name":"admin","login_time":"2021-10-28T08:07:07.900Z"},{"_id":"617a5a5262baafc714e12ea7","user_name":"admin","login_time":"2021-10-28T08:07:46.519Z"},{"_id":"617a5a6308a7ad8721a0805c","user_name":"admin","login_time":"2021-10-28T08:08:03.589Z"},{"_id":"617a5a7508a7ad8721a08060","user_name":"admin","login_time":"2021-10-28T08:08:21.172Z"},{"_id":"617a5aeb92058ff85ce6e854","user_name":"admin","login_time":"2021-10-28T08:10:19.623Z"},{"_id":"617a5b044b697092c6e6c5d2","user_name":"admin","login_time":"2021-10-28T08:10:44.962Z"},{"_id":"617a5b247e2906cbf95e4e56","user_name":"admin","login_time":"2021-10-28T08:11:16.749Z"},{"_id":"617a5b9f3293e2de4f122aeb","user_name":"admin","login_time":"2021-10-28T08:13:19.913Z"},{"_id":"617a5bbf4b827eb8f1fcc42e","user_name":"admin","login_time":"2021-10-28T08:13:51.863Z"},{"_id":"617a5bf47b99cc55f614b897","user_name":"admin","login_time":"2021-10-28T08:14:44.171Z"},{"_id":"617a5c22212bd7ddf998bce6","user_name":"admin","login_time":"2021-10-28T08:15:30.913Z"},{"_id":"617a5c4f212bd7ddf998bcf0","user_name":"admin","login_time":"2021-10-28T08:16:15.550Z"},{"_id":"617a5c55212bd7ddf998bcf2","user_name":"admin","login_time":"2021-10-28T08:16:21.721Z"},{"_id":"617a5cd967450199ec4d8c5a","user_name":"admin","login_time":"2021-10-28T08:18:33.690Z"},{"_id":"617a5d0fee669c89bc9434d1","user_name":"admin","login_time":"2021-10-28T08:19:27.823Z"},{"_id":"617a99daee669c89bc9440fa","user_name":"admin","login_time":"2021-10-28T12:38:50.440Z"},{"_id":"617a9e09ee669c89bc9441d1","user_name":"admin","login_time":"2021-10-28T12:56:41.050Z"},{"_id":"617a9e1eee669c89bc9441d6","user_name":"admin","login_time":"2021-10-28T12:57:02.245Z"},{"_id":"617a9e25ee669c89bc9441d9","user_name":"admin","login_time":"2021-10-28T12:57:09.118Z"},{"_id":"617a9e2aee669c89bc9441db","user_name":"admin","login_time":"2021-10-28T12:57:14.231Z"},{"_id":"617a9eccf45fc7679bd1b71d","user_name":"admin","login_time":"2021-10-28T12:59:56.945Z"},{"_id":"617a9ee87ce8fc45847dec6c","user_name":"admin","login_time":"2021-10-28T13:00:24.839Z"},{"_id":"617a9f0328af86eec0c89f79","user_name":"admin","login_time":"2021-10-28T13:00:51.802Z"},{"_id":"617a9f35b0b69b9965b107a9","user_name":"admin","login_time":"2021-10-28T13:01:41.904Z"},{"_id":"617a9f3dcc95b20caf1905a2","user_name":"admin","login_time":"2021-10-28T13:01:49.063Z"},{"_id":"617aa152de5e4541d4f4fc9b","user_name":"admin","login_time":"2021-10-28T13:10:42.908Z"},{"_id":"617aa1b23fb75bcdb80cb8c4","user_name":"admin","login_time":"2021-10-28T13:12:18.929Z"},{"_id":"617aa216c471227fe01789b4","user_name":"admin","login_time":"2021-10-28T13:13:58.205Z"},{"_id":"617aa22e1015bb993ab2ed19","user_name":"admin","login_time":"2021-10-28T13:14:22.978Z"},{"_id":"617aa26602e52154b5a49e97","user_name":"admin","login_time":"2021-10-28T13:15:18.676Z"},{"_id":"617aa281b5258a700502b0a7","user_name":"admin","login_time":"2021-10-28T13:15:45.344Z"},{"_id":"617aad9468e681c3fecb8d40","user_name":"admin","login_time":"2021-10-28T14:03:00.918Z"},{"_id":"617aad9468e681c3fecb8d3f","user_name":"admin","login_time":"2021-10-28T14:03:00.915Z"},{"_id":"617aad9668e681c3fecb8d41","user_name":"admin","login_time":"2021-10-28T14:03:02.456Z"},{"_id":"617aaddb401c923c87000e1b","user_name":"admin","login_time":"2021-10-28T14:04:11.445Z"},{"_id":"617aadffd57ddace37fd55b3","user_name":"admin","login_time":"2021-10-28T14:04:47.145Z"}]');

    log(userData[1]);

    // log("start")
    // log(JSON.stringify(userData))
    // log("end")
    res.status(200).render('userStats');

})
//user stats --



//websocket ++
const WebSocket = require("ws");
const { time } = require('console');
const wss = new WebSocket.Server({ port: 8080 });


wss.on("connection", async ws => {
    log("new client connected");


    //load 15 most recent from db
    const fifteenMostRecentDataPoints = await collection.find().limit(15).sort({ $natural: -1 }).toArray();

    let fanDataForInitialConnection = {};
    fanDataForInitialConnection.fanData = fifteenMostRecentDataPoints;
    fanDataForInitialConnection.identifier = 'initial-data';

    wss.clients.forEach(async (client) => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(fanDataForInitialConnection));
        }
    })


    ws.on("message", async data => {

        let clientData = JSON.parse(data);

        log(clientData)

        if (clientData.identifier === 'fan-data') {

            let dataForFan = {};

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

            // let dateString = new Date().toISOString().split('T')[0];

            // log(`Datestring: ${dateString}`)

            let dateStringStart = `2021-${clientData.startMonth}-${clientData.startDay}`;
            let dateStringEnd = `2021-${clientData.endMonth}-${clientData.endDay}`;

            log(`dateStringStart: ${dateStringStart}`)
            log(`dateStringEnd: ${dateStringEnd}`)

            let from = dateStringStart + 'T' + clientData.timeStart + ':00.000'
            log("from: " + from)

            let to = dateStringEnd + 'T' + clientData.timeEnd + ':00.000'
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

            log("aggregated fanData From DB: ", dataArray);


            let fanDataForTimePeriod = {};
            fanDataForTimePeriod.identifier = 'aggregate-data';
            fanDataForTimePeriod.fanData = dataArray;

            wss.clients.forEach(async (client) => {

                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(fanDataForTimePeriod));

                }
            })



        } else if (clientData.identifier === 'most-recent-data') {

            //send 15 most recent datapoints

            let numberOfDataPoints = clientData.numberOfDataPoints;

            //load 15 most recent from db
            const mostRecentDataPoints = await collection.find().limit(numberOfDataPoints).sort({ $natural: -1 }).toArray();


            let fanDataWithMostRecentDataPoints = {};
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


