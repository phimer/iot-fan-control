let log = console.log;

const DATAPOINTS = 15;


var GRAPH_IS_IN_CONTINOUS_MODE = true;

var waitForPressureToSettle = false;
const WAIT_FOR_PRESSURE_TO_SETTLE_TIMEOUT = 40000;


//connection to server websocket
const ws = new WebSocket("ws://Localhost:8080");


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

        //if user is looking at aggregated data -> disable adding of new data points
        if (GRAPH_IS_IN_CONTINOUS_MODE) {

            // log('GRAPH_IS_IN_CONTINOUS_MODE = true')

            //add point to graph
            changeGraphSingle(fanDataPoint, false);

        }

    } else if (fanDataObj.identifier === 'aggregate-data') {
        // log("aggregate-data")

        if (fanDataObj.fanData.length === 0) { //no data for time period

            $('#no-data-available-warning').empty().show().append(`No data available for current time period`);

        }

        let fanDataPoints = fanDataObj.fanData;

        changeGraphMulti(fanDataPoints, {
            resetGraph: true,
            reverseDataArray: false,
            smallGraphPoints: false,
            isAggregateData: true,
            roundDecimalPlaces: true
        });





        GRAPH_IS_IN_CONTINOUS_MODE = false;

    } else if (fanDataObj.identifier === 'most-recent-data') {

        let fanDataPoints = fanDataObj.fanData;

        log(fanDataPoints);

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

        if (options.roundDecimalPlaces === true) {
            elem.pressure = Math.round(elem.pressure * 10) / 10;
            elem.speed = Math.round(elem.speed * 10) / 10;
        }

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

    //if data is aggregate data -> datestring is just hour of aggregate data + day and month
    if (options.isAggregateData) {
        let aggregateDataDateString;



        let date = new Date(data.firstDateInGroup); //"2021-10-27T16:22:35.837"
        log("date", date);

        aggregateDataDateString = `${date.getDate()}-${date.getMonth() + 1} - ${data.firstHourDataPointInGroup}:00`;
        return aggregateDataDateString;
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
function setTimePeriodAndDate() {

    let timeStart = document.getElementById("time-period-from-input").value;
    let timeEnd = document.getElementById("time-period-to-input").value;

    let startDay = $('#day-input-start').val();
    let startMonth = $('#month-input-start').val();

    let endDay = $('#day-input-end').val();
    let endMonth = $('#month-input-end').val();

    log("timeStart: " + timeStart)

    let timePeriodData = {};
    timePeriodData.timeStart = timeStart;
    timePeriodData.timeEnd = timeEnd;
    timePeriodData.startDay = startDay;
    timePeriodData.startMonth = startMonth;
    timePeriodData.endDay = endDay;
    timePeriodData.endMonth = endMonth;
    timePeriodData.identifier = 'time-period-data';

    $('#no-data-available-warning').hide();


    ws.send(JSON.stringify(timePeriodData));

}


const showCurrentDataInGraph = async () => {

    //open 
    GRAPH_IS_IN_CONTINOUS_MODE = true;

    let data = {};
    data.identifier = 'most-recent-data';
    data.numberOfDataPoints = 15;


    $('#no-data-available-warning').hide();

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


//AUTO and MANUAL selection ++
const selectManualMode = async () => {

    $('#pressure-input-div').hide();
    $('#fan-speed-input-div').show();

    $('#manual-button').addClass('button-activated');
    $('#auto-button').removeClass('button-activated');


}



const selectAutoMode = async () => {

    $('#fan-speed-input-div').hide();
    $('#pressure-input-div').show();

    $('#auto-button').addClass('button-activated');
    $('#manual-button').removeClass('button-activated');

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
//AUTO and MANUAL selection --



// const getUserStats = async () => {
//     window.location.href = "http://localhost"
// }