var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require("crypto");

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
    );
}

const styleToString = (style) => {
    return Object.keys(style).reduce((acc, key) => (
        acc + key.split(/(?=[A-Z])/).join('-').toLowerCase() + ':' + style[key] + ';'
    ), '');
};

var pendingLogin = {};
var users = {};
var writingUsers = [];

app.get('/', function(req, res){
	res.sendFile(__dirname + '/login.html');
});

app.get('/chat', function(req, res) {
	res.sendFile(__dirname + '/chat.html');
});

io.on('connection', function(socket) {
    socket.on('login', (name, cb) => {
        name = name.trim();
        let res = {};
        res["code"] = null;
        res["uuid"] = null;
        if (Object.values(users).includes(name)) {
            res["code"] = "Nickname already in use.";
        } else {
            if (name.length == 0) {
                res["code"] = "Nickname cannot be empty.";
            } else if (name.length >= 20) {
                res["code"] = "Nickname is too long.";
            } else if (name.includes(" ")) {
                res["code"] = "Nickname can't contain spaces.";
            } else {
                    var uuid = uuidv4();
                pendingLogin[uuid] = name;
                console.log("User logged in: (" + uuid + ") " + name);
                res["uuid"] = uuid;
            }
        }
        cb(res);
    });

    socket.on('reqLogin', (loginUUID, cb) => {
        if (loginUUID in pendingLogin) {
            users[socket.id] = pendingLogin[loginUUID];
            console.log("User joined the chat: (" + loginUUID + ") " + users[socket.id]);
            io.emit("newUser", users[socket.id]);
            cb(users[socket.id]);
        } else {
            cb(null);
        }
    });

    socket.on('disconnect', reason => {
        if (socket.id in users) {
            console.log('User logged out: ' + users[socket.id]);
            io.emit('userDisconnected', users[socket.id]);
            delete users[socket.id];
            writingUsers = writingUsers.filter((item) => item != socket.id);
            updateWritingState();
        }
    });
    
    socket.on("chatCommand", function(command, cb) {
        var response = "";
        var style = {};
        switch (command[0]) {
            case "/help":
                style["color"] = "green";
                response = "Here are the available commands:<br/><br/><code>/users</code><br/>Displays the connected users<br/><br/><code>/msg (user) (message)</code><br/>Sends a private message to the specified user.<br/><br/>";
                break;
            case "/users":
                style["color"] = "green";
                response = "Here are the connected users:<br/><br/>";
                let i = 0;
                let usernames = Object.values(users);
                usernames.forEach((user) =>{
                    response += "&lt" + user + "&gt";
                    i++;
                    if (i != usernames.length) {
                        response += ", ";
                    }
                });
                response += "<br/><br/>"
                break;
            case "/msg":
                if (command.length < 3) {
                    style["color"] = "red";
                    response = "Invalid syntax. Usage:<br/><br/><code>/msg (user) (message)</code><br/>Sends a private message to the specified user.<br/><br/>";
                } else {
                    let usernames = Object.entries(users);
                    let id = -1;
                    for (let i = 0; i < usernames.length; i++) {
                        if (usernames[i][1] == command[1]) {
                            id = i;
                            break;
                        }
                    }
                    if (id != -1) {
                        let sendText = command.slice(2).join(" ");
                        let data = {
                            user: users[socket.id],
                            content: sendText,
                            private: true
                        };
                        console.log('Got message: ', data);
                        io.sockets.sockets.find((s) => s.id == usernames[id][0]).emit('chatMessage', data);
                        style["color"] = "green";
                        response = "You whisper to &lt;" + usernames[id][1] + "&gt;:<br/>" + sendText.replace("<", "&lt;").replace("&", "&amp;") + "<br/><br/>";
                    } else {
                        style["color"] = "red";
                        response = "The specified user was not found.<br/>Run <code>/users</code> to list the connected users.<br/><br/>";
                    }
                }
                break;
            default:
                style["color"] = "red";
                response = "Unknown command.<br/>Run <code>/help</code> to get the list of available commands.<br/><br/>";
                break;
        }
        cb({style: styleToString(style), content: response});
    });

    socket.on('chatMessage', function(msg){
        if (socket.id in users) {
            let data = {
                user: users[socket.id],
                content: msg,
                private: false
            }
            console.log('Got message: ', data);
            socket.broadcast.emit('chatMessage', data);
        }
    });

    function updateWritingState() {
        io.sockets.sockets.forEach(function (otherSocket) {
            let otherSockets = writingUsers.filter((item) => item != otherSocket.id);
            let names = [];
            otherSockets.forEach((s) => names.push(users[s]));
            if (otherSockets.length == 0)
                otherSocket.emit("changeWriting", null);
            else if (otherSockets.length > 5)
                otherSocket.emit("changeWriting", []);
            else
                otherSocket.emit("changeWriting", names);
        });
    }

    socket.on('startWriting', function(){
        if (socket.id in users && !writingUsers.includes(socket.id)) {
            writingUsers.push(socket.id);
            updateWritingState();
        }
    });

    socket.on("stopWriting", function(){
        if (socket.id in users && writingUsers.includes(socket.id)) {
            writingUsers = writingUsers.filter((item) => item != socket.id);
            updateWritingState();
        }
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
