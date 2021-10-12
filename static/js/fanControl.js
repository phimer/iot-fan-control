let log = console.log;

const DATAPOINTS = 15;






//connection to server websocket
const ws = new WebSocket("ws://Localhost:8080");
log("ws: ", ws);



ws.addEventListener("open", () => {
    log("connected to port 8080");

})

let timeStamps = [];
let pressureDataPoints = [];
let fanSpeedDataPoints = [];






ws.addEventListener("message", ({ data }) => {

    let fanDataObj = JSON.parse(data);

    if (fanDataObj.identifier === 'initial-data') {

        let fanDataPoints = fanDataObj.fanData;

        log(fanDataPoints);

        showFanStats(fanDataPoints[0]);

        for (let index = 14; index >= 0; index--) {

            changeGraph(fanDataPoints[index]);

        }





    } else if (fanDataObj.identifier === 'continous-data') {

        let fanDataPoint = fanDataObj.fanData;

        log(fanDataPoint);



        showFanStats(fanDataPoint)

        //changeSVG(fanData.pressure);

        //add timestamps to graph labels

        changeGraph(fanDataPoint);

    }



})

const changeGraph = async (fanData) => {

    //change time ++
    let date = new Date(fanData.time);

    let hours = (date.getHours() < 10 ? '0' : '') + date.getHours();
    let minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    let seconds = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();

    let dateString = `${hours}:${minutes}:${seconds}`;


    timeStamps.push(dateString);

    if (timeStamps.length > DATAPOINTS) {
        timeStamps.splice(0, 1);
    }
    //change time --


    //change pressure ++

    pressureDataPoints.push(fanData.pressure.toString());
    if (pressureDataPoints.length > DATAPOINTS) {
        pressureDataPoints.splice(0, 1);
    }
    //change pressure --



    //change fan-speed ++

    fanSpeedDataPoints.push(fanData.speed.toString());
    if (fanSpeedDataPoints.length > DATAPOINTS) {
        fanSpeedDataPoints.splice(0, 1);
    }
    //change fan-speed --

    //update graph
    pressureChart.update();

}

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



function login() {

    window.location.href = window.location.href + "fan-control/";
}



function logout() {

    window.location.href = "http://localhost:3000/logout/";
}



//GRPAH//////////////////////////////////////////////////////////


//var ctx = document.getElementById('myChart').getContext('2d');
var ctx = $('#pressure-chart');
var pressureChart = new Chart(ctx, {
    type: 'line', //bar, horizontalBar, pie, line, doughnut, rada, polarArea
    data: {
        labels: timeStamps,
        datasets: [{
            label: 'PRESSURE',
            data: pressureDataPoints,
            backgroundColor: [
                'white'
            ],
            borderColor: [
                'cyan'
            ],
            borderWidth: 1,
            yAxisID: 'yPressure'
        },
        {
            label: 'FAN-SPEED',
            data: fanSpeedDataPoints,
            backgroundColor: [
                'white'
            ],
            borderColor: [
                'magenta'
            ],
            borderWidth: 1,
            yAxisID: 'ySpeed'
        }],
        // hoverOffset: 4
    },
    options: {
        responsive: true,
        // maintainAspectRatio: false,
        scales: {
            yPressure: {
                beginAtZero: true,
                maxTicksLimit: 9,
                stepSize: 10,
                suggestedMax: 90,
                position: 'left',
                // display: true,
                ticks: {
                    callback: (value, index, values) => { return value + 'Pa' }
                }

            },
            ySpeed: {
                beginAtZero: true,
                maxTicksLimit: 10,
                stepSize: 10,
                suggestedMax: 100,
                position: 'right',
                ticks: {
                    callback: (value, index, values) => { return value + '%' }
                }
            }
        }
    }
});