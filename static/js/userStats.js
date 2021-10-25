
// fetch('http://localhost:3000/getUserStats').then(async res => {

//     let userStats = await res.text();
//     userStatsObj = JSON.parse(userStats);

// }
// )



// //connection to server websocket
// const ws = new WebSocket("ws://Localhost:8080");



// // Make the function wait until the connection is made...
// const waitForSocketConnection = async (socket, callback) => {
//     setTimeout(
//         function () {
//             if (socket.readyState === 1) {
//                 console.log("Connection is made")
//                 if (callback != null) {
//                     callback();
//                 }
//             } else {
//                 console.log("wait for connection...")
//                 waitForSocketConnection(socket, callback);
//             }

//         }, 5); // wait 5 milisecond for the connection...
// }


// ws.addEventListener("open", () => {
//     console.log("connected to port 8080");

// })

// let obj = {};
// obj.identifier = "user-stats    "

// waitForSocketConnection(ws, () => {
//     ws.send(JSON.stringify(obj));
// })




// ws.addEventListener("message", ({ data }) => {

//     let dataObj = JSON.parse(data);

//     console.log(dataObj);

// });

