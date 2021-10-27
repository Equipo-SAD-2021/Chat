var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require("crypto");

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
    );
}

var pendingLogin = {};
var users = {};

app.get('/', function(req, res){
	res.sendFile(__dirname + '/login.html');
});

app.get('/chat', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    socket.on('login', (name, cb) => {
        if (Object.values(users).includes(name)) {
            cb(null);
        } else {
            var uuid = uuidv4();
            pendingLogin[uuid] = name;
            console.log("User logged in: (" + uuid + ") " + name);
            cb(uuid);
        }
    });

    socket.on('reqLogin', (loginUUID, cb) => {
        if (loginUUID in pendingLogin) {
            users[socket.id] = pendingLogin[loginUUID];
            console.log("User joined the chat: (" + loginUUID + ") " + users[socket.id]);
            io.emit("newUser", users[socket.id]);
            cb(true);
        } else {
            cb(false);
        }
    });

    socket.on('disconnect', reason => {
        if (socket.id in users) {
            console.log('User logged out: ' + users[socket.id]);
            io.emit('userDisconnected', users[socket.id]);
            delete users[socket.id];
        }
    });

    socket.on('chatMessage', function(msg){
        console.log('Message sent: ' + msg);
        io.emit('chatMessage', msg);
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
