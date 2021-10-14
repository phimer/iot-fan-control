let log = console.log;

const DATAPOINTS = 15;


let GRAPH_IS_IN_CONTINOUS_MODE = true;



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

    log("PORT BOOLEAN = " + GRAPH_IS_IN_CONTINOUS_MODE);

    let fanDataObj = JSON.parse(data);



    if (fanDataObj.identifier === 'initial-data') {

        let fanDataPoints = fanDataObj.fanData;

        log(fanDataPoints);

        showFanStats(fanDataPoints[0]);

        changeGraphMulti(fanDataPoints, false, true, false);

        // for (let index = 14; index >= 0; index--) {

        //     changeGraphSingle(fanDataPoints[index]);

        // }

        fanChart.update();



    } else if (fanDataObj.identifier === 'continous-data') {

        let fanDataPoint = fanDataObj.fanData;

        log(fanDataPoint);

        showFanStats(fanDataPoint)

        //if user is looking at aggregated data -> disable adding of new data points
        if (GRAPH_IS_IN_CONTINOUS_MODE) {

            log('GRAPH_IS_IN_CONTINOUS_MODE = true')



            //add point to graph
            changeGraphSingle(fanDataPoint, false);

        }

    } else if (fanDataObj.identifier === 'time-period-data') {
        log("time period data")


        changeGraphMulti(fanDataObj.fanData, true, false, true);

        GRAPH_IS_IN_CONTINOUS_MODE = false;

    } else if (fanDataObj.identifier === 'most-recent-data') {

        let fanDataPoints = fanDataObj.fanData;

        log(fanDataPoints);

        showFanStats(fanDataPoints[0]);

        changeGraphMulti(fanDataPoints, true, true, true);


        fanChart.update();

    }



})



const changeGraphMulti = async (fanDataPoints, resetGraph, reverseDataArray, smallGraphPoints) => {


    if (reverseDataArray) { fanDataPoints = fanDataPoints.reverse(); }
    //array has to be reversed


    if (resetGraph) {

        log("reset")
        //clear dataPoints
        timeStamps = [];
        pressureDataPoints = [];
        fanSpeedDataPoints = [];

        fanChart.data.labels = timeStamps;
        fanChart.data.datasets[0].data = pressureDataPoints;
        fanChart.data.datasets[1].data = fanSpeedDataPoints;

        // //if time-period data comes in it has to be reversed again, dont know why
        // fanDataPoints = fanDataPoints.reverse();


    }


    log("timestampts: ", timeStamps)

    log(fanDataPoints)




    fanDataPoints.forEach(elem => {

        let dateString = createDateString(elem.time);


        timeStamps.push(dateString);

        pressureDataPoints.push(elem.pressure.toString());

        fanSpeedDataPoints.push(elem.speed.toString());


    })

    if (smallGraphPoints) {

        changeGraphPointSize(0);

    } else {
        changeGraphPointSize(2);

    }



    // log("timeStamps: ", timeStamps)
    // log("pressureDataPoints: ", pressureDataPoints)
    // log('fanSpeedDataPoints: ', fanSpeedDataPoints)

    //update graph
    fanChart.update();

}


const changeGraphSingle = async (fanData, smallGraphPoints) => {

    //change time ++

    let dateString = createDateString(fanData.time);

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



    if (smallGraphPoints) {

        changeGraphPointSize(0.5);

    } else {
        changeGraphPointSize(2);

    }



    //update graph
    fanChart.update();

}

const changeGraphPointSize = (pointRadius, hoverSize) => {



    //change size of graph points
    fanChart.data.datasets[0].pointRadius = pointRadius;
    fanChart.data.datasets[1].pointRadius = pointRadius;



}

const createDateString = (time) => {
    let date = new Date(time);

    let month = (date.getMonth());
    let day = date.getDay();

    let hours = (date.getHours() < 10 ? '0' : '') + date.getHours();
    let minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    let seconds = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();

    let dateString = `${day}.${month} - ${hours}:${minutes}:${seconds}`;

    return dateString;
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
    pressureData.identifier = 'fan-data';

    ws.send(JSON.stringify(pressureData));

    //change graph to recent data points (if user is looking at time data and sets new pressure graph should update)
    //not sure if graph should update or not??
    showCurrentDataInGraph();
}


function setFanSpeed() {


    let fanSpeed = document.getElementById("fan-speed-input").value;


    log("sending speed to server")

    let fanSpeedData = {};
    fanSpeedData.fanSpeed = fanSpeed;
    fanSpeedData.mode = 'manual';
    fanSpeedData.identifier = 'fan-data';

    ws.send(JSON.stringify(fanSpeedData));

    //change graph to recent data points (if user is looking at time data and sets new pressure graph should update)
    //not sure if graph should update or not??
    showCurrentDataInGraph();
}


//user sets time period
//server sends back data for that time perdiod
//closes websocket connection (in websocket function)
function setTimePeriod() {


    let from = document.getElementById("time-period-from-input").value;
    let to = document.getElementById("time-period-to-input").value;

    log("from: " + from)

    let timePeriodData = {};
    timePeriodData.from = from;
    timePeriodData.to = to;
    timePeriodData.identifier = 'time-period-data';

    ws.send(JSON.stringify(timePeriodData));




}


const showCurrentDataInGraph = async () => {

    //open 
    GRAPH_IS_IN_CONTINOUS_MODE = true;


    let data = {};
    data.identifier = 'most-recent-data';
    data.numberOfDataPoints = 15;

    //request current 15 data points from server
    ws.send(JSON.stringify(data));


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
var fanChart = new Chart(ctx, {
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
            yAxisID: 'yPressure',
            pointRadius: 2,
            pointHoverRadius: 5
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
            yAxisID: 'ySpeed',
            pointRadius: 2,
            pointHoverRadius: 5
        }],
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            yPressure: {
                beginAtZero: true,
                maxTicksLimit: 12,
                stepSize: 10,
                suggestedMax: 120,
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
