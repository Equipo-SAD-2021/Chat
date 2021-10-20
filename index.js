var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {}; //Stores all the usernames. The index is each socket's id

app.get('/', function(req, res){
	res.sendFile(__dirname + '/login.html');
});

app.post('/index.html', function(req, res){
	res.sendFile(__dirname + '/login.html');
});

/* app.get('/', function(req, res){
  var username = req.query.nickname;
  res.sendFile(__dirname + '/index.html');
}); */

io.on('connection', function(socket){
  socket.on('login', (name) => {
    console.log(users);
    if (Object.values(users).includes(name)) {
      socket.emit("login", null);
    } else {
      users[socket.id] = name;
      console.log("logged in " + name);
      socket.emit('login', name);
    }
  });

  /* 
  1. User connects
  2. Support for nicknames
  */
  /* socket.on('login', name => {
    users[socket.id] = name;
  }); */
  socket.on('new user', nickname => {
    console.log('User ' + nickname + ' joined');
    io.emit('new user', nickname);
  });
  console.log('a user connected');

  /* 
  1. User disconnects
  2. Support for nicknames
  */
  socket.on('disconnect', nickname => {
    console.log('User ' + nickname + ' disconnected');
    io.emit('user disconnected', nickname);
  });
  console.log('a user disconnected');

  /* Chat msg */ 
  socket.on('chat message', function(msg){
    let data = {
      //from: users[socket.id],
      message: msg,
    }
    console.log('message: ' + data);
    io.emit('chat message', data);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
