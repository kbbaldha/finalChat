var express = require('express');
var router = express.Router();
var session = require('express-session');
var bodyParser = require('body-parser'),
    exec = require("child_process").exec,
	querystring = require("querystring"),
	fs = require("fs"),
	path = require("path"),
// http = require('http'),
   mysql = require("mysql"),
    connection = mysql.createConnection({
        //user: "root",               // For Offline Database
        //password: "",               // For Offline Database
        //database: "chat_db"         // For Offline Database

        host: 'db4free.net',      // For Online database
        user: "chattingapp",      // For Online database
        password: "zeusChatApp",  // For Online database
        database: "chatappzeus"   // For Online database
    });

/* GET home page. */

var sess;
router.use(session({ cookie: { path: '/', httpOnly: true, maxAge: null }, secret: 'ssshhhhh' }));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.get(['/login', '/'], function (req, res, next) {
    if (req.session.user_name) {
        res.redirect('/chat');
    }
    else {
        var html_dir = './public/';
        res.sendfile(html_dir + 'login.htm');
    }
});

router.post('/login', function (req, res, next) {



    connection.query("SELECT * FROM user_information WHERE user_id = '" + req.body.user_name + "' AND user_pass = '" + req.body.user_pass + "';",
            function (error, rows, fields) {
                if (error) {
                    var html_dir = './public/';
                    res.sendfile(html_dir + 'login.htm');
                }
                else {
                    if (rows.length > 0) {
                        console.log('allow to chat');
                        sess = req.session;
                        sess.user_name = req.body.user_name;
                        res.redirect('/chat');

                    }

                    else {
                        var html_dir = './public/';
                        res.sendfile(html_dir + 'invalid_login.html');
                    }
                }
            });

});

router.post('/register', function (req, res, next) {
    console.log("INSERT INTO user_information (user_id,user_fname,user_lname,user_pass,online) VALUES ('" + req.body.email + "','" + req.body.first_name + "','" + req.body.last_name + "','" + req.body.password + "',0);");
    connection.query("INSERT INTO user_information (user_id,user_fname,user_lname,user_pass,online) VALUES ('" + req.body.email + "','" + req.body.first_name + "','" + req.body.last_name + "','" + req.body.password + "',0);",
    function (error, rows, fields) {
        if (error) {
            res.send('error.................................');
        }
        else {
            var html_dir = './public/';
            res.sendfile(html_dir + 'registration_successful.html');
        }
    });

});



router.get('/signedOff', function (req, res, next) {
    var html_dir = './public/';
    res.sendfile(html_dir + 'signed_off.html');
});
router.post('/getNewFriend', function (req, res, next) {

    connection.query("SELECT user_id, user_fname, online,conversation_id FROM user_information ui NATURAL JOIN friend_list fl where user_id = '" + req.body.friendId + "' AND friend_id = '" + req.session.user_name + "';",
            function (error, rows, fields) {
                res.send(JSON.stringify(rows));
            });
});
router.get('/getUsers', function (req, res, next) {
    var userid = req.session.user_name;

    connection.query("SELECT U1.user_id, U1.user_fname, U1.online,F1.conversation_id FROM user_information U1\
                        INNER JOIN friend_list F1\
                        WHERE U1.user_id\
                        IN (\
                        \
                        SELECT friend_id\
                        FROM user_information U\
                        INNER JOIN friend_list F\
                        WHERE U.user_id = F.user_id\
                        AND U.user_id =  '"+ userid + "'\
                        )\
                        AND U1.user_id = F1.friend_id AND F1.user_id = '" + userid + "';",
            function (error, rows, fields) {
                res.send(JSON.stringify(rows));
            });
});
router.get('/chat', function (req, res, next) {
    sess = req.session;


    if (sess.user_name) {
        var html_dir = './public/';
        res.sendfile(html_dir + 'client.html');
    }
    else {
        res.redirect('/login');
    }


    //res.sendfile(html_dir + 'login.htm');
});

router.get('/getUser', function (req, res, next) {
    var userName;
    connection.query("SELECT user_id,user_fname FROM user_information WHERE user_id = '" + req.session.user_name + "';", function (error, rows, fields) {
        if (rows.length > 0) {
            res.send(JSON.stringify(rows));
        }
    });

});

router.get('/logout', function (req, res, next) {
    console.log('logout');
    req.session.destroy();
    res.send('logout');

});
router.post('/searchFriend', function (req, res, next) {

    connection.query("SELECT user_id,user_fname FROM user_information WHERE user_fname LIKE '%" + req.body.searchName + "%' AND user_id NOT IN ( select friend_id from friend_list WHERE user_id='" + req.session.user_name + "');", function (error, rows, fields) {
        if (rows.length > 0) {

            res.send(JSON.stringify(rows));
        }
        else {
            res.send('No user found');
        }
    });


});
router.post('/friendRequestAccepted', function (req, res, next) {

    var clId = req.body.clientId,
         frId = req.body.friendId,
         io = req.io,
         conversationId = clId + '#' + frId;

    // Check to see if the folder is there else create
    fs.mkdir('./conversation-history/' + conversationId, function (err) {
        if (err) {
            if (err.code == 'EEXIST') {

            } else {
                console.log("Folder creation error");
            }
        } else {
            fs.mkdir('./conversation-history/' + conversationId + '/uploaded/', function (err) {
                if (err) {
                    if (err.code == 'EEXIST') {

                    } else {
                        console.log("Folder creation error");
                    }
                }
            });
        }
    });

    connection.query("INSERT INTO friend_list (user_id,friend_id,conversation_id) VALUES ('" + clId + "','" + frId + "','" + conversationId + "');");
    connection.query("INSERT INTO friend_list (user_id,friend_id,conversation_id) VALUES ('" + frId + "','" + clId + "','" + conversationId + "');");
    connection.query("SELECT socket_id FROM user_information WHERE user_id = '" + frId + "';", function (error, rows, fields) {
        if (rows.length > 0) {

            // res.send(JSON.stringify(rows));
            var socketid = rows[0]['socket_id'],
                 socket = io.sockets.connected[socketid];
            // when friend is online send notification immidiately
            if (socket) {
                console.log('notification sent');
                connection.query("SELECT user_fname,user_id FROM user_information WHERE user_id = '" + clId + "';",
                 function (error, rows, fields) {
                     if (rows.length > 0) {

                         socket.emit("friend_request_accepted", { friend_name: rows[0]["user_fname"], friend_id: rows[0]["user_id"] });
                         res.send('accepted-friend-notification');
                     }

                 });

            }
                //store notifiction in db where type - 1 is notification of accepted friend request
            else {

                connection.query("INSERT INTO pending_friend_request (user_id,friend_id,type) VALUES ('" + clId + "','" + frId + "',1);", function (err, rows, fields) {
                    if (err) {
                        console.log('-------------------------err-----------' + err);
                        throw err;
                    }
                });
                res.send('accepted-friend-notification');

            }

        }
        else {
            res.send('no friend  found');
        }
    });


});

router.post('/sendFriendRequest', function (req, res, next) {
    var io = req.io;

    connection.query("SELECT socket_id FROM user_information WHERE user_id = '" + req.body.friendId + "';", function (error, rows, fields) {
        if (rows.length > 0) {

            // res.send(JSON.stringify(rows));
            var socketid = rows[0]['socket_id'],
                 socket = io.sockets.connected[socketid];
            if (socket) {

                connection.query("SELECT user_fname FROM user_information WHERE user_id = '" + req.body.clientId + "';",
                 function (error, rows, fields) {
                     if (rows.length > 0) {

                         socket.emit("friend_request", { friend_name: rows[0]["user_fname"], friend_id: req.body.clientId });
                         res.send('friendReqSent');
                     }

                 });

            }
            else {

                connection.query("INSERT INTO pending_friend_request (user_id,friend_id,type) VALUES ('" + req.body.clientId + "','" + req.body.friendId + "',0);");
                /* Request added to database*/
                res.send('friendReqSent');
            }
        }
        else {
            res.send('no friend  found');
        }
    });




});
router.post('/getNotification', function (req, res, next) {

    connection.query("SELECT user_id,user_fname,type FROM user_information NATURAL JOIN pending_friend_request  WHERE friend_id= '" + req.session.user_name + "';", function (error, rows, fields) {
        if (rows.length > 0) {
            var rowJson = JSON.stringify(rows);
            console.log("DELETE FROM pending_friend_request WHERE friend_id= '" + req.session.user_name + "';");
            connection.query("DELETE FROM pending_friend_request WHERE friend_id= '" + req.session.user_name + "';");
            res.send(rowJson);
        }
        else {
            res.send('No Pending Requests');
        }
    });


});

function addSocketInfoToDatabase(user, socketid, io) {

    connection.query("SELECT * FROM user_information WHERE user_id = '" + user + "' AND online = '" + 1 + "';", function (error, rows, fields) {
        if (rows.length > 0) {
            var socid;
            for (var i = 0; i < rows.length; i++) {
                socid = rows[i]["socket_id"];
                if (io.sockets.connected[socid]) {
                    io.sockets.connected[socid].emit("logout_client", { message: "connected elsewhere" });
                }
            }
        }
    });
    connection.query("UPDATE user_information SET socket_id = '" + socketid + "' WHERE user_id = '" + user + "';");
    connection.query("UPDATE user_information SET online = '" + 1 + "' WHERE user_id = '" + user + "';");
    updateOfflineMessages(user, socketid, io);
}
/**
* Updates the offline messages of the user
*/
function updateOfflineMessages(user, socketid, io) {

    connection.query("SELECT user_fname,msgCount,friend_id FROM user_information INNER JOIN offline_messages ON user_information.user_id = offline_messages.friend_id WHERE offline_messages.user_id = '" + user + "';", function (error, rows, fields) {
        if (rows.length > 0) {
            for (var i = 0; i < rows.length; i++) {
                if (io.sockets.connected[socketid]) {
                    io.sockets.connected[socketid].emit("number_of_offline_messages", {
                        msgCount: rows[i]["msgCount"], clientName: rows[i]["user_fname"],
                        clientId: rows[i]["friend_id"]
                    });
                }
            }
            deleteOfflineMessages(user);
        }
    });

}
/**
* Deletes the previously stored offline messages of the passed user
*/
function deleteOfflineMessages(user) {
    connection.query("DELETE FROM offline_messages WHERE user_id = '" + user + "';");
}

function upload(response, postData) {
    console.log('Request handler for upload called');
    response.writeHead(200, { "Content-type": "text/plain" });
    response.write("You had sent:" + querystring.parse(postData).text);
    response.end();
}

function sendTypingNotification(data, io) {
    console.log(data.friend);
    var callback = function (error, rows, fields) {

        console.log(data['message']);
        if (rows.length > 0) {
            var socketid = rows[0]['socket_id'],
                clientId = rows[0]['user_id'];
            if (io.sockets.connected[socketid]) {
                io.sockets.connected[socketid].emit("typing_notification_to_client", { message: data["message"], clientName: data["clientName"], clientId: data["clientId"] });
            } else {

            }
        }
        else {
            console.log('no socket');
        }
    };
    // console.log('------------db query --------------');
    connection.query("SELECT socket_id,user_id FROM user_information WHERE user_id = '" + data["friend"] + "';", callback);
}


function sendMessage(data, io) {
    var callback = function (error, rows, fields) {


        if (rows.length > 0) {

            var socketid = rows[0]['socket_id'],
                clientId = rows[0]['user_id'];
            if (io.sockets.connected[socketid]) {
                io.sockets.connected[socketid].emit("message_to_client", { message: data["message"], clientName: data["clientName"], clientId: data["clientId"] });
            } else {
                // The user if offline store his messages
                console.log("client name is :" + data["clientName"]);
                connection.query(" INSERT INTO  offline_messages (user_id,friend_id,msgCount) VALUES ('" + data["friend"] + "','" + data["clientId"] + "',1)\
                                                    ON DUPLICATE KEY UPDATE msgCount = msgCount + 1;", function (error, rows, fields) {
                                                        if (error) {
                                                            console.log('error' + error);
                                                        }
                                                    });
                //connection.query("INSERT INTO offline_messages  (user_id,friend_id,count) VALUES ('" + data["friend"] + "','" + data["clientId"] + "','" + data["message"] + "');");
            }

            // Store the message in the conversation history
            addMessageToConversationHistor(data["clientId"], data["friend"], data["message"]);

        }

        else {
            console.log('no socket');
        }
    };
    // console.log('------------db query --------------');
    connection.query("SELECT socket_id,user_id FROM user_information WHERE user_id = '" + data["friend"] + "';", callback);



}

function addMessageToConversationHistor(sender, receiver, message,isFile) {
    connection.query("SELECT conversation_id FROM friend_list WHERE user_id='" + sender + "' AND friend_id = '" + receiver + "';",
        function (error, rows, fields) {
            if (rows.length > 0) {
                var conId = rows[0]['conversation_id'],
                    users = conId.split('#'),
                    date = getTodaysDate(),
                    myData, filename = './conversation-history/' + conId + '/' + date + '.json';

                console.log("filename is ::::::" + filename);
                if (users[0] === sender) {
                    if (isFile) {
                        myData = { "1": "", file: message.originalname, fileUniqueName: message.name };
                    } else {
                        myData = { "1": message };
                    }
                } else {
                    if (isFile) {
                        myData = { "2": "", file: message.originalname, fileUniqueName: message.name };
                    } else {
                        myData = { "2": message };
                    }
                }
                
                // Check if there is a date with the current date
                fs.exists(filename, function (exists) {
                    if (exists) {
                        // Modify the file
                        fs.appendFile(filename, ',' + JSON.stringify(myData, null, 4), function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("JSON appended to " + filename);
                            }
                        });
                    } else {
                        // Add row to table and and 
                        /*
                        connection.query("INSERT INTO conversation_history (conversation_id,date) VALUES ('" + conId + "','" + getDateForSQL() + "');",
                            function (error, rows, fields) {
                                if (error) {
                                    console.log('errror:' + error);
                                }
                            });
                            */
                        // create a file & add the message
                        fs.writeFile(filename, JSON.stringify(myData, null, 4), function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("JSON saved to " + filename);
                            }
                        });

                    }
                });
            }
        });
}

function getTodaysDate() {
    var str = "";
    var date = new Date();
    str += date.getDate() + "-";
    str += (date.getMonth() + 1) + "-";
    str += date.getFullYear();

    return str;
}

function getDateForSQL() {
    var str = "";
    var date = new Date();
    str += date.getFullYear() + "-";
    str += (date.getMonth() + 1) + "-";
    str += date.getDate();

    console.log('INSERTING IN DB:' + str);
    return str;
}

function getMonth(no) {
    var month;
    switch (no) {
        case 1:
            month = "Jan"
            break;
        case 2:
            month = "Feb"
            break;
        case 3:
            month = "Mar"
            break;
        case 4:
            month = "Apr"
            break;
        case 5:
            month = "May"
            break;
        case 6:
            month = "Jun"
            break;
        case 7:
            month = "Jul"
            break;
        case 8:
            month = "Aug"
            break;
        case 9:
            month = "Sep"
            break;
        case 10:
            month = "Oct"
            break;
        case 11:
            month = "Nov";
            break;
        case 12:
            month = "Dec";
            break;
    }

    return month;
}
/**
* Returns the closest date to the current date from the folder
*/
function getClosestDate(folderStructure, curDate, res, userIdentity, friendId) {
    var splitDate = curDate.split('-'),
        date = splitDate[0],
        month = splitDate[1], parsedDate, closestVal = 0, diffDays, closestDiffDays,
        year = splitDate[2], i = 0, j, k, curFile, splitFile;

    fs.readdir(folderStructure + '/', function (err, files) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(files);
        for (; i < files.length; i++) {
            curFile = files[i];
            curFile = curFile.replace('.json', '');
            console.log(' Current File is:' + curFile);
            splitFile = curFile.split('-');
            parsedDate = new Date(parseInt(splitFile[2]), parseInt(splitFile[1]) - 1, parseInt(splitFile[0]));
            var timeDiff = new Date(parseInt(year), parseInt(month) - 1, parseInt(date)).getTime() - parsedDate.getTime();
            if (timeDiff >= 0) {
                diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                if (closestDiffDays === null || closestDiffDays === undefined) {
                    closestDiffDays = diffDays;
                    closestVal = i;
                }
                if (diffDays < closestDiffDays) {
                    closestVal = i;
                    closestDiffDays = diffDays;
                }
            }
        }
        if (closestDiffDays !== null && closestDiffDays !== undefined) {
            returnLastFileData(folderStructure + '/' + files[closestVal], res, userIdentity, friendId, files[closestVal]);
        } else {
            res.send('{"last":"y","friendId":"' + friendId + '"}');
        }
    });
}

function returnLastFileData(filename, res, userIdentity, friendId, currentFile) {
    fs.readFile(filename, { encoding: 'utf-8' }, function (err, data) {
        if (!err) {
            res.json('[{"userIdentity":' + userIdentity + ',"friendId":"' + friendId + '","currentFile":"' + currentFile + '"},' + data + ']');
        }
    });
}

router.post('/getLastDayConversation', function (req, res, next) {
    var userid = req.session.user_name;
    console.log('inside getLastDayConversation in server');
    connection.query("SELECT conversation_id FROM friend_list WHERE user_id='" + userid + "' AND friend_id = '" + req.body.friendId + "';",
        function (error, rows, fields) {
            if (rows.length > 0) {
                var conId = rows[0]['conversation_id'],
                    users = conId.split('#'),
                    date = getTodaysDate(),
                    folderStructure = './conversation-history/' + conId,

                    userIdentity;

                // Checking if the user is 1 or 2
                if (userid === users[0]) {
                    userIdentity = "1";
                } else {
                    userIdentity = "2";
                }


                // Check if there is a conversation history for these users
                fs.exists(folderStructure, function (exists) {
                    if (exists) {
                        getClosestDate(folderStructure, date, res, userIdentity, req.body.friendId);
                    } else {
                        // There is no conversation history
                        res.send(true);
                    }
                });
            }
        });
});


router.post('/getMore', function (req, res, next) {
    var userid = req.session.user_name;
    console.log('inside getMore in server');
    connection.query("SELECT conversation_id FROM friend_list WHERE user_id='" + userid + "' AND friend_id = '" + req.body.friendId + "';",
        function (error, rows, fields) {
            if (rows.length > 0) {
                var conId = rows[0]['conversation_id'],
                    users = conId.split('#'),
                    filename = req.body.currentFile,
                    date = filename.replace('.json', ''),
                    splitFile = date.split('-'),
                    parsedDate = new Date(parseInt(splitFile[2]), parseInt(splitFile[1]) - 1, parseInt(splitFile[0])),
                    folderStructure = './conversation-history/' + conId,
                    userIdentity, finalDate;

                parsedDate.setDate(parsedDate.getDate() - 1);

                // Check if it is the first request
                if (req.body.currentFile === "" || req.body.currentFile === null || req.body.currentFile === undefined) {
                    finalDate = getTodaysDate();
                } else {
                    finalDate = getDateInString(parsedDate);
                }

                // Checking if the user is 1 or 2
                if (userid === users[0]) {
                    userIdentity = "1";
                } else {
                    userIdentity = "2";
                }


                // Check if there is a conversation history for these users
                fs.exists(folderStructure, function (exists) {
                    if (exists) {
                        getClosestDate(folderStructure, finalDate, res, userIdentity, req.body.friendId);
                    } else {
                        // There is no conversation history
                        res.send(true);
                    }
                });
            }
        });
});

router.post('/upload', function (req, res, next) {
    console.log('the file uploaded is ' + req.body.file);
    console.log(req.files);
    var friendId = getFriendIdFromConId(req.conId, req.session.user_name);
    sendFileAcceptRequest(friendId, req.files['file-upload'], req.io, req.session.user_name);
    // Adding file to the conversation history
    addMessageToConversationHistor(req.session.user_name, friendId, req.files['file-upload'],true)
    res.send('file uploaded');
});

function getFriendIdFromConId(conId, userId) {
    var users = conId.split('#');
    if (users[0] === userId) {
        return users[1];
    } else {
        return users[0];
    }
}

function sendFileAcceptRequest(userId, file,io,senderId) {
    connection.query("SELECT socket_id,user_id FROM user_information WHERE user_id = '" + userId + "';", function (error, rows, fields) {
        
        if (rows.length > 0) {
            var socketid = rows[0]['socket_id'],
                clientId = rows[0]['user_id'];
            if (io.sockets.connected[socketid]) {
                io.sockets.connected[socketid].emit("file_transfer_request", { file: file,  senderId: senderId });
            } else {

            }
        }
        else {
            console.log('no socket');
        }
    });
}

router.post('/getFileForDownload', function (req, res, next) {
    console.log('the path is ::' + './conversation-history/' + req.body.conId + '/uploaded/' + req.body.fileName);
    res.download('./conversation-history/' + req.body.conId + '/uploaded/' + req.body.fileName, req.body.fileDownloadName, function (err) {
        if (err) {
            console.log('errrrrrrrrrr'+err);
            // Handle error, but keep in mind the response may be partially-sent
            // so check res.headersSent
        } else {
            console.log('File sent');
            // decrement a download credit, etc.
        }
    });
});
/**
* Whenever the user is disconnected from the socket this function is called from app.js
* Id is stored inside the passed object as obj.id
*/
function disconnectUser(data, io) {
    connection.query("SELECT user_id FROM user_information WHERE socket_id='" + data.id + "';", function (error, rows, fields) {
        if (rows.length > 0) {
            var user = rows[0]['user_id'];
            console.log(user + "disconnected");
            connection.query("UPDATE user_information SET online = '" + 0 + "' WHERE user_id = '" + user + "';");
            io.sockets.emit("user_offline", { user_id: user });
        } else {
            console.log("unknown user disconnected");
        }
    });
}

function getDateInString(date) {
    var str = "";

    str += date.getDate() + "-";
    str += (date.getMonth() + 1) + "-";
    str += date.getFullYear();

    return str;
}

function getConID(userId) {

}

module.exports = router;
router.addSocketInfoToDatabase = addSocketInfoToDatabase;
router.sendMessage = sendMessage;
router.sendTypingNotification = sendTypingNotification;
router.disconnectUser = disconnectUser;
router.getConID = getConID;