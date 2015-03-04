var socketio,
    clientName,
    clientId;


function bindEvents() {

   // $('.add-button').on("click", friendRequestAccepted);
   
}
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
});

function sendFriendRequest(event) {
    console.log(' fsendFriendRequest  pted');
    var containerElement = $(event.target.parentElement),
        friendId = containerElement.find('.friend-found-id').html();

    $.post(ChatApplication.SERVER_ADDRESS + "/sendFriendRequest", { clientId: clientId, friendId: friendId }, function (result) {
        if (result == 'friendReqSent') {
            $('.friend-found').find('.' + friendId).parent().html('Friend Request Sent').fadeOut(1000, function () { $(this).remove(); });
        }
    });
}

function searchUserByName(event) {
    var searchName = $('#search_input').val();       

    $.post(ChatApplication.SERVER_ADDRESS + "/searchFriend", {  searchName: searchName }, function (result) {
        console.log(result);
        result = JSON.parse(result);
        var length = result.length,
            i = 0,
            htmlStr = '',
            current,
            $container = $('#search-result-container');
        $container.html('');
        for (; i < length; i++) {
            current = result[i];
            htmlStr = '<div class="friend-found"> \
                    <div class="friend-found-name">' + current.user_fname + '</div> \
                    <div class="friend-found-id '+ current.user_id + '">' + current.user_id + '</div> \
                    <div class="send-request-button button-class">send friend request</div> \
                </div>';
            $container.append(htmlStr);
        }
       
        $('.send-request-button').off("click", sendFriendRequest).on("click", sendFriendRequest);
    });
}
function friendRequestCancelClicked(event) {
    $(event.target).parent().html('Cancelled').fadeOut(1000, function () { $(this).remove(); });
}
function friendRequestAddClicked(event) {
    var friendId = event.target.classList[2];

    /* TODO :- disable add button*/
    $.post(ChatApplication.SERVER_ADDRESS + "/friendRequestAccepted", { clientId: clientId, friendId: friendId }, function (result) {
        console.log('result---------' + result);
        if (result == 'accepted-friend-notification') {
           
            getUsersOfApp();
            $('.notification').find('.' + friendId).parent().html('Friend Added').fadeOut(1000, function () { $(this).remove(); });
        }
    });
}

function connectToServer() {

    socketio = io.connect(ChatApplication.SERVER_ADDRESS, { query: 'loggeduser=' + app.clientInfo.user_id });
   /* socketio.on("message_to_client", function (data) {
        if ($('#friend_chat_' + data['clientId']).length == 0) {
            $('.chatlog').append(getChatWindowHTML(data['clientName'],data['clientId']));
        }
        //$('#friend_chat_' + data['clientId']).find('.friend_chat_log').append('<div class="friend_chat_msg">' + data["message"] + '</div>');
        displayFriendMessage(data['clientId'], data["message"]);
    });*/
    /*
    socketio.on("user_offline", function (data) {
        $('#user_' + data.user_id + '-status').html('offline');
    });
    socketio.on("user_online", function (data) {
        $('#user_' + data.user_id + '-status').html('online');
    });*/
    socketio.on("logout_client", function (data) {
        window.location = ChatApplication.SERVER_ADDRESS + "/signedOff";
    });/*
    socketio.on("friend_request", function (data) {
        friendRequestReceived(data);
    });
    socketio.on("friend_request_accepted", function (data) {
        friendRequestAccepted(data);
    });*/
}
function friendRequestAccepted(data) {
    generateFriendRequestAcceptedNotification(data.friend_name);
    getUsersOfApp();
}
 
function generateFriendRequestAcceptedNotification(friendName){
    var htmlStr = '<div  class="friend-request-accepted-notification">' + friendName + ' accepted your friend request.</div>'
    $('#notification-holder').prepend(htmlStr);
}
function friendRequestReceived(data) {

    

    var htmlStr = '<div class="notification">' +
                    '<div class="friend-req-sender">' + data.friend_name + ' wants to be your friend</div>' +
                    '<div class="add-button button-class ' + data.friend_id + '">Add</div>' +
                    '<div class="cancel-button button-class">Cancel</div>' +
                '</div>';

    $('#notification-holder').append(htmlStr);
    $('.add-button').off("click", friendRequestAddClicked).on("click", friendRequestAddClicked);
    $('.cancel-button').off("click", friendRequestCancelClicked).on("click", friendRequestCancelClicked);
}
function getNotifications() {
    $.post(ChatApplication.SERVER_ADDRESS + "/getNotification", {  }, function (result) {
        var data = JSON.parse(result),
            noOfRequests = data.length,
            i=0,
            currentData;
        for (; i < noOfRequests; i++) {
            currentData = data[i];
            if (currentData.type == 0) {
                friendRequestReceived({ friend_name: currentData.user_fname, friend_id: currentData.user_id });
            }
            else {
                generateFriendRequestAcceptedNotification(currentData.user_fname);
            }
        }
        
    });
}
function sendMessage(element) {
    var friendname = element.id,
       inputbox = $('#friend_chat_' + element.id).find('input'),
       msg = inputbox.val();
    inputbox.val("");
    //$('#friend_chat_' + element.id).find('.friend_chat_log').append('<div class="me_chat">' + msg + '</div>');
    displayMyMessage(element.id,msg);
    socketio.emit("message_to_server", { message: msg, friend: friendname, clientName: clientName ,clientId :clientId});
}


function getUserName() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", ChatApplication.SERVER_ADDRESS + "/getUser", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var clientInfo = JSON.parse(xmlhttp.responseText)
            clientId = clientInfo[0].user_id;
            clientName = clientInfo[0].user_fname;
            connectToServer();
            setUser(clientName);
            getUsersOfApp();
            getNotifications();
        }
    }
    xmlhttp.send();
}
function logout() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", ChatApplication.SERVER_ADDRESS + "/logout", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            if (xmlhttp.responseText == 'logout') {
                window.location = ChatApplication.SERVER_ADDRESS + "/login";
            }
            console.log('loogged out');
            //setAppUsers();
        }
    }
    xmlhttp.send();
}
function getUsersOfApp() {
    return;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", ChatApplication.SERVER_ADDRESS + "/getUsers", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            setAppUsers(JSON.parse(xmlhttp.responseText));

            //setAppUsers();
        }
    }
    xmlhttp.send();
}
function setAppUsers(users) {
    var noOfUsers = users.length,
        i = 0,
        output = '<div class="user_list_heading">List of users</div>',
        username, status;
    for (; i < noOfUsers; i++) {
        friendId = users[i]['user_id'];
        username = users[i]['user_fname'];
        status = (users[i]['online'] == 0) ? "offline" : "online";
        output += '<div id="user_' + friendId + '-container" class="user-list-name-container" >';
        output += '<div id="user_' + friendId + '" class="user_list_name" >' + username + "</div>";
        output += '<div id="user_' + friendId + '-status" class="user-status" >' + status + '</div></div>';
    }
    document.getElementById('users_of_app').innerHTML = output;

    $('.user_list_name').on('click', userClicked);

}
function userClicked(event) {
    var userId = event.target.getAttribute("id").replace("user_", "");
    if ($('#friend_chat_' + userId).length > 0) {
        return;
    }
    $('.chatlog').append(getChatWindowHTML(event.target.textContent, userId));
    displayLastDayConversation(userId);
}
function setUser(name) {
    document.getElementById('user').innerHTML = 'welcome ' + name;
}

function getChatWindowHTML(username,userid) {
    var html = '<div id="friend_chat_' + userid + '" class="friend_chat">' +
     '<div id="friend_name" class="friend_name">' + username + '</div>' +
    '<input type="text" id="message_input"/>' +
    '<button id = "' + userid + '"onclick="sendMessage(this)">send</button>' +
    '<div id="friend_chat_log" class="friend_chat_log"></div>' +
    '</div>';   
    
    return html;
}
/**
* Displays the Last Day conversation of the user
* userId The id of the friend
*/
function displayLastDayConversation(userId) {
    console.log('inside display last date in mainscript');
    $.post(ChatApplication.SERVER_ADDRESS + "/getLastDayConversation", { friendId: userId }, function (result) {
        console.log('result is :' + result);
        parseAndDisplayConversation(result);
    });
}

function parseAndDisplayConversation(result) {
    var i = 1, currentMsg,
        result = JSON.parse(result),
        userIdentity = result[0]['userIdentity'],
        friendId = result[0]['friendId'],
        friendIdentity = (userIdentity === 1) ? 2 : 1;
    for (; i < result.length; i++) {
        currentMsg = result[i];
        if (currentMsg[userIdentity] !== null && currentMsg[userIdentity] !== undefined) {
            // I sent it
            displayMyMessage(friendId, currentMsg[userIdentity]);
        } else {
            // My friend sent it
            displayFriendMessage(friendId, currentMsg[friendIdentity]);
        }
    }
}
/**
* Displays The message I sent to my friend
*/
function displayMyMessage(myID, msg) {
    $('#friend_chat_' + myID).find('.friend_chat_log').append('<div class="me_chat">' + msg + '</div>');
}
/**
* Displays The message my friend sent to me
*/
function displayFriendMessage(myID, msg) {
    $('#friend_chat_' + myID).find('.friend_chat_log').append('<div class="friend_chat_msg">' + msg + '</div>');
}
bindEvents();