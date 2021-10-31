'use strict';
const log = console.log;

const DATAPOINTS = 15;

let GRAPH_IS_IN_CONTINOUS_MODE = true;

let waitForPressureToSettle = false;
const WAIT_FOR_PRESSURE_TO_SETTLE_TIMEOUT = 60000;


//connection to server websocket
const ws = new WebSocket("ws://Localhost:8080");


ws.addEventListener("open", () => {
    log("connected to port 8080");

})

let timeStamps = [];
let pressureDataPoints = [];
let fanSpeedDataPoints = [];


ws.addEventListener("message", ({ data }) => {

    const fanDataObj = JSON.parse(data);

    if (fanDataObj.identifier === 'initial-data') {

        const fanDataPoints = fanDataObj.fanData;

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

        const fanDataPoint = fanDataObj.fanData;

        log(fanDataPoint);

        showFanStats(fanDataPoint)

        //catch if pressure doesn't settle //32
        if (fanDataPoint.error === true && waitForPressureToSettle === false) {
            $('#pressure-warning').empty().show().append(`Pressure is not settling at ${fanDataPoint.setpoint}Pa`);
        } else {
            $('#pressure-warning').hide();
        }

        //if user is looking at aggregated data -> disable adding of new data points
        if (GRAPH_IS_IN_CONTINOUS_MODE) {

            //add point to graph
            changeGraphSingle(fanDataPoint, false);

        }

    } else if (fanDataObj.identifier === 'aggregate-data') {
        // log("aggregate-data")

        if (fanDataObj.fanData.length === 0) { //no data for time period

            $('#no-data-available-warning').empty().show().append(`No data available for current time period`);

        }

        const fanDataPoints = fanDataObj.fanData;

        changeGraphMulti(fanDataPoints, {
            resetGraph: true,
            reverseDataArray: false,
            smallGraphPoints: false,
            isAggregateData: true,
            roundDecimalPlaces: true
        });





        GRAPH_IS_IN_CONTINOUS_MODE = false;

    } else if (fanDataObj.identifier === 'most-recent-data') {

        const fanDataPoints = fanDataObj.fanData;

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

    const dateString = createDateString(fanData, {
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

        const date = new Date(data.firstDateInGroup); //"2021-10-27T16:22:35.837"

        aggregateDataDateString = `${date.getDate()}-${date.getMonth() + 1} - ${data.firstHourDataPointInGroup}:00`;
        return aggregateDataDateString;
    }


    const date = new Date(data.time);

    const month = (date.getMonth());
    const day = date.getDay();

    const hours = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    const seconds = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();

    return `${hours}:${minutes}:${seconds}`;

}


const showFanStats = fanData => {


    $(document).ready(() => {


        $('#setpoint').empty().append(fanData.setpoint);
        $('#speed').empty().append(fanData.speed);
        $('#pressure').empty().append(fanData.pressure);

        const fanMode = (fanData.auto === true) ? 'AUTO' : 'MANUAL';
        $('#mode').empty().append(fanMode);

    })

}


const setPressure = async () => {

    const pressure = document.getElementById("pressure-slider").value;

    log("sending pressure to server")

    const pressureData = {};
    pressureData.pressure = pressure;
    pressureData.mode = 'auto';
    pressureData.identifier = 'fan-data';

    ws.send(JSON.stringify(pressureData));
    removePressureWarning();

    //change graph to recent data points (if user is looking at time data and sets new pressure graph should update)
    //not sure if graph should update or not??
    showCurrentDataInGraph();

    $('#setpoint').empty().append(pressure);

    //fetch pressure to log user statistics
    fetch('http://localhost:3000/pressure');
}


const setFanSpeed = () => {

    const fanSpeed = document.getElementById("fan-speed-slider").value;

    $('#setpoint').empty().append(fanSpeed);


    log("sending speed to server")

    const fanSpeedData = {};
    fanSpeedData.fanSpeed = fanSpeed;
    fanSpeedData.mode = 'manual';
    fanSpeedData.identifier = 'fan-data';

    ws.send(JSON.stringify(fanSpeedData));
    removePressureWarning();

    //change graph to recent data points (if user is looking at time data and sets new pressure graph should update)
    //not sure if graph should update or not??
    showCurrentDataInGraph();

    fetch('http://localhost:3000/fan-speed');
}


//user sets time period
//server sends back data for that time perdiod
//closes websocket connection (in websocket function)
const setTimePeriodAndDate = () => {

    const timeStart = document.getElementById("time-period-from-input").value;
    const timeEnd = document.getElementById("time-period-to-input").value;

    const startDate = new Date($('#date-input-start').val());
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth() + 1;


    const endDate = new Date($('#date-input-end').val());
    const endDay = endDate.getDate();
    const endMonth = endDate.getMonth() + 1;

    log("timeStart: " + timeStart)

    const timePeriodData = {};
    timePeriodData.timeStart = timeStart;
    timePeriodData.timeEnd = timeEnd;
    timePeriodData.startDay = startDay;
    timePeriodData.startMonth = startMonth;
    timePeriodData.endDay = endDay;
    timePeriodData.endMonth = endMonth;
    timePeriodData.identifier = 'time-period-data';

    $('#no-data-available-warning').hide();


    ws.send(JSON.stringify(timePeriodData));

    fetch('https://localhost:3000/aggregate-data');

}


const showCurrentDataInGraph = async () => {

    //open 
    GRAPH_IS_IN_CONTINOUS_MODE = true;

    const data = {};
    data.identifier = 'most-recent-data';
    data.numberOfDataPoints = 15;


    $('#no-data-available-warning').hide();

    //request current 15 data points from server
    ws.send(JSON.stringify(data));

}




const login = () => {
    window.location.href = window.location.href + "fan-control/";
}



const logout = () => {
    window.location.href = "http://localhost:3000/logout/";
}



//GRPAH//////////////////////////////////////////////////////////
const ctx = $('#pressure-chart');
const fanChart = new Chart(ctx, {
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
const pressureSlider = document.getElementById("pressure-slider");
const pressureSliderOutput = document.getElementById("pressure-slider-output");
pressureSliderOutput.innerHTML = pressureSlider.value + 'Pa';

const fanSpeedSlider = document.getElementById("fan-speed-slider");
const fanSpeedSliderOutput = document.getElementById("fan-speed-slider-output");
fanSpeedSliderOutput.innerHTML = fanSpeedSlider.value + '%';

// Update the current slider value (each time you drag the slider handle)
pressureSlider.oninput = () => {

    const pressureSliderValue = jQuery('#pressure-slider').val();


    pressureSliderOutput.innerHTML = pressureSliderValue + 'Pa';
}

fanSpeedSlider.oninput = () => {

    const fanSpeedSliderValue = jQuery('#fan-speed-slider').val();


    fanSpeedSliderOutput.innerHTML = fanSpeedSliderValue + '%';
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

    $('#auto-button').addClass('button-activated');
    $('#manual-button').addClass('button-deactivated');

}
setButtonToAutoMode(); //do when page loads


const removePressureWarning = async () => {

    $('#pressure-warning').hide();

    //set 15 second timer to let pressure adjust - error from fan simulator is still true even when the pressure gets changed
    waitForPressureToSettle = true;

    setTimeout(() => { waitForPressureToSettle = false; }, WAIT_FOR_PRESSURE_TO_SETTLE_TIMEOUT);

}
//AUTO and MANUAL selection --



//set current date in date picker ++
const setCurrentDateInDatePicker = async () => {

    const date = new Date();


    $('#date-input-start').val(`2021-${(date.getMonth()) + 1}-${date.getDate()}`);
    $('#date-input-end').val(`2021-${(date.getMonth()) + 1}-${date.getDate()}`);
}

setCurrentDateInDatePicker();


//set current date in date picker --




const showUserStats = () => {

    window.location.href = "http://localhost:3000/user-stats/"

}