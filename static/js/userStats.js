const backToFanControl = () => {
    window.location.href = "http://localhost:3000/fan-control/";
}




const showActivityOfUser = (user) => {

    $('.user-activity-class').hide();
    $('#' + user).show();

}

const showAllUsers = () => {

    $('.user-activity-class').show();

}


const logout = () => {
    window.location.href = "http://localhost:3000/logout/";
}