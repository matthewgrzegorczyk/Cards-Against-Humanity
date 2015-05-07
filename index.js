var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var moment = require('moment');
var mongoose = require('mongoose');

// mongoose.connect();

// Serve static files.
app.use(express.static('public'));

// Not needed since using express.static in this use case.
// app.get('/', function(req, res) {
//   res.sendFile(__dirname + '/index.html');
// });


var clients = {};

var log = function (msg) {
    console.log(msg);
};

var now = function () {
    return moment().format('HH:mm:ss');
};

io.on('connection', function (socket) {
    clients[socket.id] = socket.id;

    socket.getName = function () {
        return (typeof socket.username === 'undefined' ? socket.id : socket.username);
    };

    socket.joinRoom = function (name) {
        socket.join(name);
        socket.activeRoom = name;

        var msg = socket.getName() + ' connected.';
        socket.broadcast.to(name).emit('userJoin', msg);
        log(msg);

        // Update userList in room.
        io.to(name).emit('populateUserList', clients);
        socket.broadcast.to('default').emit('chatMessage', msg);
    };

    var onDisconnect = function () {
        log(socket.getName() + ' left.');
        socket.broadcast.to('default').emit('userLeft', socket.getName());
        socket.emit('dropped');

        if (clients.hasOwnProperty(socket.getName())) {
            delete clients[socket.getName()];
        }
        socket.broadcast.to('default').emit('populateUserList', clients);
    };
    
    /*
     * Event listener.
     * On set name 
     */
    var onSetName = function (name) {
        if (clients.hasOwnProperty(socket.getName())) {
            delete clients[socket.getName()];
            clients[name] = socket.id;
        }
        socket.username = name;
        socket.joinRoom('default');

    };

    var onChatMessage = function (msg) {
        console.log('[Message in ' + msg.room + '] ' + socket.getName() + ': ' + msg.text);

        // Prepare message for display.
        var message = prepareMessage(msg.text);

        if (msg.text === '/help') {
            // Display message only for the user.
            displayHelp();
        }
        else if (msg.text.indexOf('/pw') === 0) {
            var parts = msg.text.split(' ');
            var receiver = parts[1];
            var text = '[' + now() + '] ' + socket.getName() + ': ' + parts.slice(2).join(' ');

            sendPrivateMessage(text, receiver);
        }
        else {
            sendMessage(message, socket.activeRoom);
        }
    };

    var prepareMessage = function (msg) {
        return '[' + now() + '] ' + socket.getName() + ': ' + msg;
    };

    /*
     * Display help message only for the sender.
     */
    var displayHelp = function () {
        socket.emit('chatMessage', 'You have typed help.');
    };

    var sendMessage = function (msg, room) {
        io.to(room).emit('chatMessage', msg);
    };

    var sendPrivateMessage = function (msg, receiver) {
        if (clients.hasOwnProperty(receiver)) {
            socket.to(clients[receiver]).emit('privateMessage', msg);
        }
        else {
            socket.to(receiver).emit('privateMessage', msg);
        }
        // Send message to the sender.
        socket.emit('privateMessage', msg);
    };

    var kick = function (userName) {
        // If sender is Admin, then try to kick user.
        if (socket.isAdmin()) {
            if (clients.hasOwnProperty(userName)) {
                socket.to(clients[userName]).emit('kicked');
                socket.to(socket.activeRoom).emit('userKicked', userName);
            }
        }
    };

    var ban = function (userName, time) {
        if (socket.isAdmin()) {
            if (clients.hasOwnProperty(userName)) {
                socket.to(clients[userName]).emit('banned', time);
                var banInfo = { 
                    user: userName, 
                    time: time 
                };
                socket.to(socket.activeRoom).emit('userBanned', banInfo);
            }
        }
    };
    
    // Populate user list on disconnect.
    socket.on('disconnect', onDisconnect);

    // Set username
    socket.on('setName', onSetName);

    // chatMessage events
    socket.on('chatMessage', onChatMessage);
    
    socket.on('kick', kick);
    
    socket.on('ban', ban);
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
