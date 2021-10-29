var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require("crypto");

// Obtains a random uuid string.
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
    );
}

// Converts a JS object into a CSS style string.
const styleToString = (style) => {
    return Object.keys(style).reduce((acc, key) => (
        acc + key.split(/(?=[A-Z])/).join('-').toLowerCase() + ':' + style[key] + ';'
    ), '');
};

// Object that contains the login UUIDs and the linked user name.
var pendingLogin = {};

// Object that contains the socket ID and the linked user name,
var users = {};

// Array that contains the currently writing users.
var writingUsers = [];

// Map the root url to the login page.
app.get('/', function(req, res){
	res.sendFile(__dirname + '/login.html');
});

// Map the chat url to the chat page.
app.get('/chat', function(req, res) {
	res.sendFile(__dirname + '/chat.html');
});

io.on('connection', function(socket) {

    // Recieved from the login page when it requests a login.
    socket.on('login', (name, cb) => {
        name = name.trim();
        let res = {};
        res["code"] = null;
        res["uuid"] = null;
        // If the username is already in use, report back the error.
        if (Object.values(users).includes(name)) {
            res["code"] = "Nickname already in use.";
        } else {
            // Don't allow empty names.
            if (name.length == 0) {
                res["code"] = "Nickname cannot be empty.";
            // Don't allow names too long.
            } else if (name.length >= 20) {
                res["code"] = "Nickname is too long.";
            // Don't allow names with spaces (breaks the /msg command).
            } else if (name.includes(" ")) {
                res["code"] = "Nickname can't contain spaces.";
            // Perform login
            } else {
                // Generate a new random UUID and return it to the client.
                var uuid = uuidv4();
                pendingLogin[uuid] = name;
                console.log("User logged in: (" + uuid + ") " + name);
                res["uuid"] = uuid;
            }
        }
        cb(res);
    });

    // Recieved from the chat page when it tries to login using the provided UUID.
    socket.on('reqLogin', (loginUUID, cb) => {
        if (loginUUID in pendingLogin) {
            // Add the nickname stored in pendingLogin to the users object.
            users[socket.id] = pendingLogin[loginUUID];
            console.log("User joined the chat: (" + loginUUID + ") " + users[socket.id]);
            // Broadcast the user join event to the rest of the users.
            io.emit("newUser", users[socket.id]);
            // Return the stored username to the client (it is not stored in the client session storage).
            cb(users[socket.id]);
        } else {
            // Signal error
            cb(null);
        }
    });

    // Event recieved when the socket disconnects.
    socket.on('disconnect', reason => {
        // Only do an action if the socket is in the users object (in the case of an invalid state).
        // Also because the login page also triggers this function, and must be ignored.
        if (socket.id in users) {
            console.log('User logged out: ' + users[socket.id]);
            // Notify all users the user has disconnected.
            io.emit('userDisconnected', users[socket.id]);
            // Remove the user from the users object and from the typing users and update the writing state.
            delete users[socket.id];
            writingUsers = writingUsers.filter((item) => item != socket.id);
            updateWritingState();
        }
    });
    
    // Event recieved when the user runs a command.
    // The backend generates the response HTML and style.
    // WARNING: The backend must make sure the content is sanitized (doesn't contain any unwanted html).
    socket.on("chatCommand", function(command, cb) {
        // Only do an action if the socket is in the users object (in the case of an invalid state).
        if (socket.id in users) {
            var response = "";
            var style = {};
            switch (command[0]) {
                // Show the help.
                case "/help":
                    style["color"] = "green";
                    response = "Here are the available commands:<br/><br/><code>/users</code><br/>Displays the connected users<br/><br/><code>/msg (user) (message)</code><br/>Sends a private message to the specified user.<br/><br/>";
                    break;
                // Show the connected users.
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
                    response += "<br/><br/>";
                    break;
                // Private message to another user, requires an argument.
                case "/msg":
                    // Check at least 1 argument plus the message content.
                    if (command.length < 3) {
                        style["color"] = "red";
                        response = "Invalid syntax. Usage:<br/><br/><code>/msg (user) (message)</code><br/>Sends a private message to the specified user.<br/><br/>";
                    } else {
                        let usernames = Object.entries(users);
                        let id = -1;
                        // Find the user to send the private message to.
                        for (let i = 0; i < usernames.length; i++) {
                            if (usernames[i][1] == command[1]) {
                                id = i;
                                break;
                            }
                        }
                        // If the user is found...
                        if (id != -1) {
                            let sendText = command.slice(2).join(" ");
                            let data = {
                                user: users[socket.id],
                                content: sendText,
                                private: true
                            };
                            console.log('Got message: ', data);
                            // Find the socket object of the target user and emit a "chatMessage" to it (with the private flag set).
                            io.sockets.sockets.find((s) => s.id == usernames[id][0]).emit('chatMessage', data);
                            style["color"] = "green";
                            response = "You whisper to &lt;" + usernames[id][1] + "&gt;:<br/>" + sendText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "<br/><br/>";
                        // Notify the command issuer that the user was not found.
                        } else {
                            style["color"] = "red";
                            response = "The specified user was not found.<br/>Run <code>/users</code> to list the connected users.<br/><br/>";
                        }
                    }
                    break;
                // Invalid command was used, invite to use "/help".
                default:
                    style["color"] = "red";
                    response = "Unknown command.<br/>Run <code>/help</code> to get the list of available commands.<br/><br/>";
                    break;
            }
            // Return the data to the command issuer, convert the "style" object into a CSS string.
            cb({style: styleToString(style), content: response});
        }
    });

    // Event recieved when a message is sent.
    socket.on('chatMessage', function(msg){
        // Only do an action if the socket is in the users object (in the case of an invalid state).
        if (socket.id in users) {
            let data = {
                user: users[socket.id],
                content: msg,
                private: false
            }
            console.log('Got message: ', data);
            // Send the message to all the connected users (except for the one emiting the event).
            socket.broadcast.emit('chatMessage', data);
        }
    });

    // Function used to broadcast the writing state.
    function updateWritingState() {
        // For every connected socket.
        io.sockets.sockets.forEach(function (otherSocket) {
            // Discard this own socket from the socket list.
            let otherSockets = writingUsers.filter((item) => item != otherSocket.id);
            let names = [];
            // Get the username linked to every socket.
            otherSockets.forEach((s) => names.push(users[s]));
            // If nobody is typing, emit null.
            if (otherSockets.length == 0)
                otherSocket.emit("changeWriting", null);
            // If there are more than 5 people typing, emit an empty array (to signal the "Many users are typing..." message).
            else if (otherSockets.length > 5)
                otherSocket.emit("changeWriting", []);
            // Emit the constructed array otherwise.
            else
                otherSocket.emit("changeWriting", names);
        });
    }

    // Event recieved when an user starts writing.
    socket.on('startWriting', function() {
        // Only do an action if the socket is in the users object (in the case of an invalid state) and the user was not typing already.
        if (socket.id in users && !writingUsers.includes(socket.id)) {
            // Add the user to the writing array.
            writingUsers.push(socket.id);
            // Update the writing state.
            updateWritingState();
        }
    });

    // Event recieved when an user stops writing.
    socket.on("stopWriting", function(){
        // Only do an action if the socket is in the users object (in the case of an invalid state) and the user was typing.
        if (socket.id in users && writingUsers.includes(socket.id)) {
            // Remove the user from the writing array.
            writingUsers = writingUsers.filter((item) => item != socket.id);
            // Update the writing state.
            updateWritingState();
        }
    });
});

// Listen in the 3000 port.
http.listen(3000, function(){
    console.log('listening on *:3000');
});
