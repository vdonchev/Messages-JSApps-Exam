const appId = 'kid_r1tOa_cmx';
const appSecret = '7672675382a440e1a70a153d6700694c';
const appBaseUrl = 'https://baas.Kinvey.com';
const appBasicAuthentication = {Authorization: 'Basic ' + btoa(appId + ':' + appSecret)};

function startApp() {
    clearForms();
    setAjaxLoading();
    disableFormSubmit();

    bindMainMenuEvents();
    bindFormEvents();

    renderMainMenu();
    if (!userIsLoggedIn()) {
        renderHomePage();
    } else {
        setUsername();
        renderUserHomePage();
    }
}
/**
 * Events
 */
function bindMainMenuEvents() {
    $('#linkMenuAppHome').on('click', renderHomePage);
    $('#linkMenuLogin').on('click', renderLoginPage);
    $('#linkMenuRegister').on('click', renderRegisterPage);

    $('#linkMenuUserHome').on('click', renderUserHomePage);
    $('#linkMenuLogout').on('click', logout);
    $('#linkUserHomeMyMessages, #linkMenuMyMessages').on('click', renderReceivedMessages);
    $('#linkMenuArchiveSent, #linkUserHomeArchiveSent').on('click', renderSentMessages);
    $('#linkUserHomeSendMessage, #linkMenuSendMessage').on('click', renderSendMessages);
}

function bindFormEvents() {
    $('#formRegister').on('submit', register);
    $('#formLogin').on('submit', login);

    $('#formSendMessage').on('submit', sendMessage)
}

/**
 * Render
 */
function renderMainMenu() {
    $('div#app > header').find('> a, > span').hide();
    if (!userIsLoggedIn()) {
        $('#linkMenuAppHome, #linkMenuLogin, #linkMenuRegister')
            .show();
    } else {
        $('#linkMenuUserHome, #linkMenuMyMessages, #linkMenuArchiveSent, #linkMenuSendMessage, #linkMenuLogout, #spanMenuLoggedInUser')
            .show();
    }
}

function renderHomePage() {
    $('main > section').hide();
    $('#viewAppHome').show();
}

function renderUserHomePage() {
    $('main > section').hide();
    $('#viewUserHome').show();
}

function renderLoginPage() {
    $('main > section').hide();
    $('#viewLogin').show();
}

function renderRegisterPage() {
    $('main > section').hide();
    $('#viewRegister').show();
}

function renderReceivedMessages() {
    $('main > section').hide();
    $('#viewMyMessages').show();

    $('div#myMessages table tbody').find('tr').remove();

    get('appdata', 'messages?query={"recipient_username":"' + sessionStorage.getItem('userName') + '"}')
        .then(function (data) {
            renderMessages(data);
        })
        .catch(handleAjaxError);

    function renderMessages(data) {
        for (let message of data) {
            let from = formatSender(message.sender_name, message.sender_username);
            let msg = message.text;
            let date = formatDate(message._kmd.ect);

            let row = $('<tr>')
                .append($('<td>')
                    .text(from))
                .append($('<td>')
                    .text(msg))
                .append($('<td>')
                    .text(date));

            $('div#myMessages table').append(row);
        }
    }
}

function renderSentMessages() {
    $('main > section').hide();
    $('#viewArchiveSent').show();

    $('div#sentMessages table tbody').find('tr').remove();

    get('appdata', 'messages?query={"sender_username":"' + sessionStorage.getItem('userName') + '"}')
        .then(function (data) {
            renderMessages(data);
        })
        .catch(handleAjaxError);

    function renderMessages(data) {
        for (let message of data) {
            let from = message.recipient_username;
            let msg = message.text;
            let date = formatDate(message._kmd.ect);

            let row = $('<tr>')
                .append($('<td>')
                    .text(from))
                .append($('<td>')
                    .text(msg))
                .append($('<td>')
                    .text(date));

            appendDeleteButton(row, message);

            $('div#sentMessages table').append(row);
        }
    }

    function appendDeleteButton(row, message) {
        row.append($('<td>')
            .append($('<button>')
                .text('Delete')
                .on('click', () => deleteMessage(message._id))));
    }

    function deleteMessage(id) {
        del('appdata', 'messages/' + id, 'kinvey')
            .then(function () {
                showInfo('Message deleted.');
                renderSentMessages();
            })
            .catch(handleAjaxError);
    }
}

function renderSendMessages() {
    $('main > section').hide();
    $('#viewSendMessage').show();

    get('user', '', 'kinvey')
        .then(renderUsers)
        .catch(handleAjaxError);

    function renderUsers(data) {
        $('#msgRecipientUsername').find('option').remove();
        for (let user of data) {
            let userName = user.username;
            let name = user.name;

            let formatted = formatSender(name, userName);
            let option = $('<option>')
                .attr('data-name', name)
                .attr('value', userName)
                .text(formatted);

            $('#msgRecipientUsername')
                .append(option);
        }

        $('#formSendMessage').show();
    }
}

/**
 * Actions
 */
function sendMessage() {
    let selectedUser = $('#msgRecipientUsername')
        .find(':selected');
    let sender_username = sessionStorage.getItem('userName');
    let sender_name = sessionStorage.getItem('name');
    sender_name = sender_name == '' ? null : sender_name;
    let recipient_username = selectedUser.val();
    let text = $('#msgText').val();

    let reqData = {
        sender_name,
        sender_username,
        recipient_username,
        text
    };

    post('appdata', 'messages', 'kinvey', reqData)
        .then(() => {
            showInfo('Message sent.');
            renderSentMessages();
            clearForms();
        })
        .catch(handleAjaxError);
}

/**
 * Authentication
 */
function register() {
    let username = $('#registerUsername').val().trim();
    let password = $('#registerPasswd').val().trim();
    let name = $('#registerName').val().trim();

    post('user', '', 'basic', {username, password, name})
        .then(registrationSuccess)
        .catch(handleAjaxError);

    function registrationSuccess(data) {
        saveAuthInSession(data);
        renderMainMenu();
        renderUserHomePage();
        showInfo('User registration successful.');
        clearForms();
    }
}

function login() {
    let username = $('#loginUsername').val().trim();
    let password = $('#loginPasswd').val().trim();

    post('user', 'login', 'basic', {username, password})
        .then(loginSuccessful)
        .catch(handleAjaxError);

    function loginSuccessful(data) {
        saveAuthInSession(data);
        renderMainMenu();
        renderUserHomePage();
        showInfo('Login successful.');
        clearForms();
    }
}

function logout() {
    post('user', '_logout', 'kinvey')
        .then(function () {
            sessionStorage.clear();
            showInfo('Logout successful.');
            renderMainMenu();
            renderHomePage();
            clearForms();
        })
        .catch(handleAjaxError)
}

function userIsLoggedIn() {
    let userAuthToken = sessionStorage.getItem('authToken');
    return userAuthToken != '' && userAuthToken != null && userAuthToken != undefined;
}

/**
 * Alerts
 */
function showInfo(message) {
    $('#errorBox').hide();
    let box = $('#infoBox');
    box.text(message);
    box.show();
    setTimeout(function () {
        $('#infoBox').fadeOut();
    }, 3000);
}

function showError(errorMsg) {
    let box = $('#errorBox');
    box.text("Error: " + errorMsg);
    box.show();
    box.on('click', function () {
        $(this).hide();
    })
}

function handleAjaxError(response) {
    let errorMsg = JSON.stringify(response);
    if (response.readyState === 0)
        errorMsg = "Cannot connect due to network error.";
    if (response.responseJSON && response.responseJSON.description)
        errorMsg = response.responseJSON.description;
    showError(errorMsg);
}

/**
 * Helpers
 */
function clearForms() {
    $('form').trigger('reset');
}

function disableFormSubmit() {
    $('form').on('submit', function (event) {
        event.preventDefault();
    });
}

function setAjaxLoading() {
    $(document).on({
        ajaxStart: function () {
            $("#loadingBox").show()
        },
        ajaxStop: function () {
            $("#loadingBox").hide()
        }
    });
}

function saveAuthInSession(userInfo) {
    let userAuth = userInfo._kmd.authtoken;
    sessionStorage.setItem('authToken', userAuth);
    let userId = userInfo._id;
    sessionStorage.setItem('userId', userId);
    let userName = userInfo.username;
    sessionStorage.setItem('userName', userName);
    let name = userInfo.name;
    sessionStorage.setItem('name', name);

    setUsername();
}

function setUsername() {
    $('#spanMenuLoggedInUser').text("Welcome, " + sessionStorage.getItem('userName') + "!");
    $('#viewUserHomeHeading').text("Welcome, " + sessionStorage.getItem('userName') + "!");
}

function formatDate(dateISO8601) {
    let date = new Date(dateISO8601);
    if (Number.isNaN(date.getDate()))
        return '';
    return date.getDate() + '.' + padZeros(date.getMonth() + 1) +
        "." + date.getFullYear() + ' ' + date.getHours() + ':' +
        padZeros(date.getMinutes()) + ':' + padZeros(date.getSeconds());

    function padZeros(num) {
        return ('0' + num).slice(-2);
    }
}

function formatSender(name, username) {
    if (!name)
        return username;
    else
        return username + ' (' + name + ')';
}

/**
 * Kinvey
 */

function get(path, endPoint, authType) {
    let request = {
        method: 'GET',
        url: `${appBaseUrl}/${path}/${appId}/${endPoint}`
    };

    if (authType === 'basic')
        request['headers'] = appBasicAuthentication;
    else
        request['headers'] = generateKinveyAuth();

    return $.ajax(request);
}

function post(path, endPoint, authType, data) {
    let request = {
        method: 'POST',
        url: `${appBaseUrl}/${path}/${appId}/${endPoint}`
    };

    if (authType === 'basic')
        request['headers'] = appBasicAuthentication;
    else
        request['headers'] = generateKinveyAuth();

    if (data !== undefined) {
        request['contentType'] = 'application/json';
        request['data'] = JSON.stringify(data);
    }

    return $.ajax(request);
}

function put(path, endPoint, authType, data) {
    let request = {
        method: 'PUT',
        url: `${appBaseUrl}/${path}/${appId}/${endPoint}`
    };

    if (authType === 'basic')
        request['headers'] = appBasicAuthentication;
    else
        request['headers'] = generateKinveyAuth();

    if (data !== undefined) {
        request['contentType'] = 'application/json';
        request['data'] = JSON.stringify(data);
    }

    return $.ajax(request);
}

function del(path, endPoint, authType) {
    let request = {
        method: 'DELETE',
        url: `${appBaseUrl}/${path}/${appId}/${endPoint}`
    };

    if (authType === 'basic')
        request['headers'] = appBasicAuthentication;
    else
        request['headers'] = generateKinveyAuth();

    return $.ajax(request);
}

function generateKinveyAuth() {
    return {Authorization: 'Kinvey ' + sessionStorage.getItem('authToken')};
}
