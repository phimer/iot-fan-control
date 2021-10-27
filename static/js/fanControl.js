let log = console.log;

const DATAPOINTS = 15;


var GRAPH_IS_IN_CONTINOUS_MODE = true;

var waitForPressureToSettle = false;
const WAIT_FOR_PRESSURE_TO_SETTLE_TIMEOUT = 30000;


//connection to server websocket
const ws = new WebSocket("ws://Localhost:8080");
// log("ws: ", ws);



ws.addEventListener("open", () => {
    log("connected to port 8080");

})

let timeStamps = [];
let pressureDataPoints = [];
let fanSpeedDataPoints = [];






ws.addEventListener("message", ({ data }) => {

    // log("PORT BOOLEAN = " + GRAPH_IS_IN_CONTINOUS_MODE);

    let fanDataObj = JSON.parse(data);



    if (fanDataObj.identifier === 'initial-data') {

        let fanDataPoints = fanDataObj.fanData;

        log(fanDataPoints);

        showFanStats(fanDataPoints[0]);




        changeGraphMulti(fanDataPoints, {
            resetGraph: false,
            reverseDataArray: true,
            smallGraphPoints: false,
            isAggregateData: false
        });


        fanChart.update();



    } else if (fanDataObj.identifier === 'continous-data') {

        let fanDataPoint = fanDataObj.fanData;

        log(fanDataPoint);

        showFanStats(fanDataPoint)

        let pressure = fanDataPoint.pressure;
        let setpoint = fanDataPoint.setpoint;


        //catch if pressure doesn't settle //32
        if (fanDataPoint.error === true && waitForPressureToSettle === false) {
            $('#pressure-warning').empty().show().append(`Pressure is not settling at ${setpoint}Pa`);
        } else {
            $('#pressure-warning').hide();
        }

        //old +
        // if (pressure !== setpoint && ((pressure - setpoint < 5 && pressure - setpoint > 0) || (setpoint - pressure < 5 && setpoint - pressure > 0))) {

        //     pressureFailCount++;
        //     log("pressure != setpoint, failCount=" + pressureFailCount);

        //     if (pressureFailCount > 6) {
        //         $('#pressure-warning').empty().append(`Pressure is not settling at ${setpoint}Pa`);
        //     } else {
        //         $('#pressure-warning').empty();

        //     }
        // }
        //old -

        //if user is looking at aggregated data -> disable adding of new data points
        if (GRAPH_IS_IN_CONTINOUS_MODE) {

            // log('GRAPH_IS_IN_CONTINOUS_MODE = true')

            //add point to graph
            changeGraphSingle(fanDataPoint, false);

        }

    } else if (fanDataObj.identifier === 'aggregate-data') {
        log("aggregate-data")


        //todo time period under one hour should display 5 minute aggregates, over 1 hour should hourly aggregates?


        let fanDataPoints = fanDataObj.fanData;

        changeGraphMulti(fanDataPoints, {
            resetGraph: true,
            reverseDataArray: false,
            smallGraphPoints: false,
            isAggregateData: true
        });




        GRAPH_IS_IN_CONTINOUS_MODE = false;

    } else if (fanDataObj.identifier === 'most-recent-data') {

        let fanDataPoints = fanDataObj.fanData;

        log(fanDataPoints);

        //not needed, because fan stats gets updated all the time
        // showFanStats(fanDataPoints[0], {
        //     setpoint: false
        // });

        changeGraphMulti(fanDataPoints, {
            resetGraph: true,
            reverseDataArray: true,
            smallGraphPoints: false,
            isAggregateData: false
        });




        fanChart.update();

    }



})


const changeGraphMulti = async (fanDataPoints, options = {}) => {

    if (options.reverseDataArray) { fanDataPoints = fanDataPoints.reverse(); }
    //array has to be reversed

    if (options.resetGraph) {

        log("reset")
        //clear dataPoints
        timeStamps = [];
        pressureDataPoints = [];
        fanSpeedDataPoints = [];

        fanChart.data.labels = timeStamps;
        fanChart.data.datasets[0].data = pressureDataPoints;
        fanChart.data.datasets[1].data = fanSpeedDataPoints;

    }

    fanDataPoints.forEach(elem => {

        let dateString;
        if (options.isAggregateData) {
            dateString = createDateString(elem, { isAggregateData: true });
        } else {
            dateString = createDateString(elem, { isAggregateData: false });
        }

        timeStamps.push(dateString);

        pressureDataPoints.push(elem.pressure.toString());

        fanSpeedDataPoints.push(elem.speed.toString());


    })

    if (options.smallGraphPoints) {
        changeGraphPointSize(0);
    } else {
        changeGraphPointSize(2);
    }

    fanChart.update();
}


const changeGraphSingle = async (fanData, smallGraphPoints) => {


    //change time ++

    let dateString = createDateString(fanData, {
        isAggregateData: false
    });

    // log("DATESTRINGG: ", dateString)

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

const createDateString = (data, options = {}) => {

    //if data is aggregate data -> datestring is just hour of aggregate data
    if (options.isAggregateData) {
        return data.firstHourDataPointInGroup + ':00';
    }



    let date = new Date(data.time);



    let month = (date.getMonth());
    let day = date.getDay();

    let hours = (date.getHours() < 10 ? '0' : '') + date.getHours();
    let minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    let seconds = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();

    let dateString = `${hours}:${minutes}:${seconds}`; //${day}.${month} - removed day and month



    return dateString;
}


// const setSliderValue = async (fanData) => {

//     log(fanData.pressure)

//     // $('#pressure-slider').value(parseInt(fanData.pressure));
//     let slider = document.getElementById('pressure-slider');
//     slider.value = fanData.pressure.toString();

// }


function showFanStats(fanData) {


    $(document).ready(() => {


        $('#setpoint').empty().append(fanData.setpoint);
        $('#speed').empty().append(fanData.speed);
        $('#pressure').empty().append(fanData.pressure);

        let fanMode = (fanData.auto === true) ? 'AUTO' : 'MANUAL';
        $('#mode').empty().append(fanMode);

    })

}


const setPressure = async () => {


    let pressure = document.getElementById("pressure-slider").value;




    log("sending pressure to server")

    let pressureData = {};
    pressureData.pressure = pressure;
    pressureData.mode = 'auto';
    pressureData.identifier = 'fan-data';

    ws.send(JSON.stringify(pressureData));
    removePressureWarning();

    //change graph to recent data points (if user is looking at time data and sets new pressure graph should update)
    //not sure if graph should update or not??
    showCurrentDataInGraph();

    $('#setpoint').empty().append(pressure);
}


function setFanSpeed() {



    let fanSpeed = document.getElementById("fan-speed-slider").value;

    $('#setpoint').empty().append(fanSpeed);


    log("sending speed to server")

    let fanSpeedData = {};
    fanSpeedData.fanSpeed = fanSpeed;
    fanSpeedData.mode = 'manual';
    fanSpeedData.identifier = 'fan-data';

    ws.send(JSON.stringify(fanSpeedData));
    removePressureWarning();

    //change graph to recent data points (if user is looking at time data and sets new pressure graph should update)
    //not sure if graph should update or not??
    showCurrentDataInGraph();
}


//user sets time period
//server sends back data for that time perdiod
//closes websocket connection (in websocket function)
function setTimePeriod() {


    let timeStart = document.getElementById("time-period-from-input").value;
    let timeEnd = document.getElementById("time-period-to-input").value;

    log("timeStart: " + timeStart)

    let timePeriodData = {};
    timePeriodData.timeStart = timeStart;
    timePeriodData.timeEnd = timeEnd;
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
        maintainAspectRatio: false,
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



//sliders ++
var pressureSlider = document.getElementById("pressure-slider");
var pressureSliderOutput = document.getElementById("pressure-slider-output");
pressureSliderOutput.innerHTML = pressureSlider.value + 'Pa';

var fanSpeedSlider = document.getElementById("fan-speed-slider");
var fanSpeedSliderOutput = document.getElementById("fan-speed-slider-output");
fanSpeedSliderOutput.innerHTML = fanSpeedSlider.value + '%';

// Update the current slider value (each time you drag the slider handle)
pressureSlider.oninput = () => {

    let val = jQuery('#pressure-slider').val();


    pressureSliderOutput.innerHTML = val + 'Pa';
}

fanSpeedSlider.oninput = () => {

    let val = jQuery('#fan-speed-slider').val();


    fanSpeedSliderOutput.innerHTML = val + '%';
}

//sliders --

const selectManualMode = async () => {

    $('#pressure-input-div').hide();
    $('#fan-speed-input-div').show();

    $('#manual-button').toggleClass('button-activated');
    $('#auto-button').toggleClass('button-activated');

}



const selectAutoMode = async () => {

    $('#fan-speed-input-div').hide();
    $('#pressure-input-div').show();

    $('#manual-button').toggleClass('button-activated');
    $('#auto-button').toggleClass('button-activated');

}



const setButtonToAutoMode = () => {

    console.log("hello")

    $('#auto-button').addClass('button-activated');
    $('#manual-button').addClass('button-deactivated');

    // $('#auto-button').toggleClass('button-activated');
    // $('#manual-button').toggleClass('button-deactivated');
}

setButtonToAutoMode();


const removePressureWarning = async () => {

    $('#pressure-warning').hide();

    //set 15 second timer to let pressure adjust - error from fan simulator is still true even when the pressure gets changed
    waitForPressureToSettle = true;

    setTimeout(() => { waitForPressureToSettle = false; }, WAIT_FOR_PRESSURE_TO_SETTLE_TIMEOUT);

}


// const getUserStats = async () => {
//     window.location.href = "http://localhost"
// }