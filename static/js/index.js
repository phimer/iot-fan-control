let log = console.log;



var from;
var to;

var colorFrom;
var colorTo;


//connection to server websocket
const ws = new WebSocket("ws://Localhost:8080");
log("ws: ", ws);



ws.addEventListener("open", () => {
    log("connected to port 8080");

})



ws.addEventListener("message", ({ data }) => {

    log(data);

    let fanData = JSON.parse(data)

    showFanStats(fanData)



})


function showFanStats(fanData) {


    $(document).ready(() => {

        $('#speed').empty().append("Speed: " + fanData.speed + "<br>");
        $('#setpoint').empty().append("Setpoint: " + fanData.setpoint + "<br>");
        $('#pressure').empty().append("Pressure: " + fanData.pressure + "<br>");
        // $('#avg-temp').empty().append("Average temperature: " + fanData + "<br>");

    })

}


function setPressure() {


    let pressure = document.getElementById("pressure-input").value;


    log("sending pressure to server")

    let pressureData = {};
    pressureData.pressure = pressure;
    pressureData.mode = 'auto';

    ws.send(JSON.stringify(pressureData));
}




//delete maybe
// function roundToOneDecimalPlace(temperatureData) {
//     return Math.round(temperatureData.averageTemperature * 10) / 10;
// }