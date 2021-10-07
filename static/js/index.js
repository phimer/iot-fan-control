let log = console.log;

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

    changeSVG(fanData.pressure);



})


function showFanStats(fanData) {


    $(document).ready(() => {

        $('#setpoint').empty().append("Setpoint: " + fanData.setpoint + "<br>");
        $('#speed').empty().append("Speed: " + fanData.speed + "%<br>");
        $('#pressure').empty().append("Pressure: " + fanData.pressure + "<br>");

        let fanMode = (fanData.auto === true) ? 'auto' : 'manual';
        $('#mode').empty().append("Mode: " + fanMode + "<br>");

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


function setFanSpeed() {


    let fanSpeed = document.getElementById("fan-speed-input").value;


    log("sending speed to server")

    let fanSpeedData = {};
    fanSpeedData.fanSpeed = fanSpeed;
    fanSpeedData.mode = 'manual';

    ws.send(JSON.stringify(fanSpeedData));
}




//delete maybe
// function roundToOneDecimalPlace(temperatureData) {
//     return Math.round(temperatureData.averageTemperature * 10) / 10;
// }



//converts value into value usable in the svg
//range = x //120 in this case
//formatedValue = value + (x/2); //to make in positive //!!Not needed here!!
//formatedValue = x - formatedValue -> to turn it around (20 -> 80 or 75 -> 25 for ex.)
//svgGaugeNumber = Math.round(formatedValue * (575-175)/x) + 175;
const formatToSvgValue = (value) => {



    // let formatedValue = value + 60;
    let formatedValue = 120 - value;


    let svgGaugeNumber = Math.round(formatedValue * ((575 - 175) / 120)) + 175;


    return svgGaugeNumber;

}

let pressureTo;
let pressureFrom;

//function changeSVG(color, pressure) {
function changeSVG(pressure) {

    let svg = document.getElementById("pressure-gauge-test").contentDocument;


    let pressureInSvgFormat = formatToSvgValue(parseInt(pressure));


    //gauge size
    if (pressureTo === undefined) {
        pressureFrom = "M500,750L500,575";
    } else {
        pressureFrom = pressureTo;
    }

    pressureTo = "M500,750L500," + pressureInSvgFormat;

    // log("to", to);
    // log("from", from)

    svg.getElementById('gauge-animate').setAttribute('from', pressureFrom)
    svg.getElementById('gauge-animate').setAttribute('to', pressureTo)
    svg.getElementById('gauge-animate').beginElement();


    // //gauge color
    // colorTo = color;

    // svg.getElementById('gauge-color-animate').setAttribute('from', colorFrom)
    // svg.getElementById('gauge-color-animate').setAttribute('to', colorTo)
    // svg.getElementById('gauge-color-animate').beginElement();

    // //bulb color
    // svg.getElementById('bulb-color-animate').setAttribute('from', colorFrom)
    // svg.getElementById('bulb-color-animate').setAttribute('to', colorTo)
    // svg.getElementById('bulb-color-animate').beginElement();

    // colorFrom = colorTo;



}