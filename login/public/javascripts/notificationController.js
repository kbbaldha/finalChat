app.controller("notificationController", function ($scope, $rootScope, $http) {

    $scope.$on('socketObjCreated', function (event) {
        bindSocketEvents();
    });


    var site = ChatApplication.SERVER_ADDRESS;

    $scope.notifications = [];
    getNotifications();
   
    $scope.cancelClicked = function (notification) {
        removeNotification(notification);
       
    }
    $scope.acceptClicked = function (notification) {
        console.log('accept clicked');  
        $.post(ChatApplication.SERVER_ADDRESS + "/friendRequestAccepted", { clientId: app.clientInfo.user_id, friendId: notification.user_id }, function (result) {
            console.log('result---------' + result);
            if (result == 'accepted-friend-notification') {
                removeNotification(notification);
                $rootScope.$broadcast('friendAdded', { user_id: notification.user_id});
                //getUsersOfApp();
                //$('.notification').find('.' + friendId).parent().html('Friend Added').fadeOut(1000, function () { $(this).remove(); });
            }
        });
    }
    function removeNotification(notification) {
        var notifications = $scope.notifications,
            length = notifications.length,
            i = 0,
            current;
        for (; i < length; i++) {
            current = notifications[i];

            if (notification.user_id == current.user_id) {
                if (notification.type == current.type) {
                    notifications.splice(i, 1);                   
                    return;
                }
            }
        }
    }
    function bindSocketEvents() {
        console.log('bind socket');
        socketio.on("friend_request", function (data) {
            friendRequestReceived(data);
        });
        socketio.on("friend_request_accepted", function (data) {
            friendRequestAccepted(data);
        });
    }
    function friendRequestReceived(data) {
        $scope.notifications.push({ type: 0, user_fname: data.friend_name, user_id: data.friend_id });
        $scope.$apply();
    }
    function friendRequestAccepted(data) {
        $scope.notifications.push({ type: 1, user_fname: data.friend_name, user_id: data.friend_id });
        $scope.$apply();
    }
    function getNotifications() {
        $.post(ChatApplication.SERVER_ADDRESS + "/getNotification", {}, function (result) {
            if (result != "No Pending Requests") {
                var data = JSON.parse(result),
                noOfRequests = data.length,
                i = 0,
                currentData;
                for (; i < noOfRequests; i++) {
                    currentData = data[i];

                    if (currentData.type == 0) {
                        $scope.notifications.push({ type: 0, user_fname: currentData.user_fname, user_id: currentData.user_id });
                        //friendRequestReceived({ friend_name: currentData.user_fname, friend_id: currentData.user_id });
                    }
                    else {
                        $scope.notifications.push({ type: 1, user_fname: currentData.user_fname });

                    }
                }
                $scope.$apply();
            }
            else {
                console.log("No notifications");
            }
        });
    }

});