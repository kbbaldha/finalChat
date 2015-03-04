app.controller("searchController", function ($scope, $rootScope, $http) {

    var site = ChatApplication.SERVER_ADDRESS;
    var page = "/getUsers";

    $scope.searchFriendInput = '';
    $scope.friendsFound;
    $scope.friendFoundSelected;
    $scope.enterOnQueryInput = function (keyEvent) {
        if (keyEvent.which === 13 || keyEvent.keyCode === 13) {
            $scope.searchFriend();
        }
    }
    $scope.searchFriend = function () {
        var searchName = $('#search_input').val();
        $scope.friendsFound = [];
        $.post(ChatApplication.SERVER_ADDRESS + "/searchFriend", { searchName: $scope.searchFriendInput }, function (result) {
            var i = 0,
                length,
                currentFound;
            result = JSON.parse(result);
            $scope.friendsFound = result;
            length = result.length;
            for (; i < length; i++) {
                currentFound = $scope.friendsFound[i];
                currentFound.sent = false;
            }
            $scope.$apply();
            $(function () {
                $('[data-toggle="tooltip"]').tooltip()
            });
        });
    }
    $scope.sendFriendRequest = function (friend,$index) {
        friend.innerhtml = 'sending.....';
        $scope.friendFoundSelected = $index;
        // $scope.$apply();
        if (!friend.sent) {
            friend.sent = true;
            $.post(ChatApplication.SERVER_ADDRESS + "/sendFriendRequest", { clientId: app.clientInfo.user_id, friendId: friend.user_id }, function (result) {
                if (result == 'friendReqSent') {
                    friend.innerhtml = 'Friend Request Sent';
                    $scope.$apply();
                    removeFriend(friend);
                    $scope.friendFoundSelected = '';
                }
                else {
                    friend.sent = false;
                    $scope.$apply();
                }
            });
        }

    }
    function removeFriend(friendToBeDeleted) {
        var friends = $scope.friendsFound,
            length = friends.length,
            i=0,
            current;
        for (; i < length; i++) {
            current = friends[i];

            if (friendToBeDeleted.user_id == current.user_id) {
               
                    friends.splice(i, 1);
                    $scope.$apply();
                    return;
                
            }
        }

    }
});