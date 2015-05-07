/* global io, $ */
var socket = io();

socket.getName = function() {
    return (typeof socket.username === 'undefined' ? socket.id : socket.username);
};

var $setName = $('#setName');
var $chat = $('#chat');
var $messages = $('#messages');
var $message = $('#m');
var $myName = $('#myName');
var $userList = $('#userList');

var activeRoom = 'default';

// Event emiters.
$setName.on('submit', function() {
    var username = $myName.val();
    if(username.trim().length !== 0) {
        socket.emit('setName', $myName.val());
        $myName.val('');
    }
    $setName.parents('.setName').fadeOut(300, function() {
        $chat.fadeIn();
    });
    return false;
});

$('#sendMessage').on('submit', function(e) {
    e.preventDefault();
    var msg = $message.val();
    if(msg.trim().length !== 0) {
        socket.emit('chatMessage', {room: activeRoom, text: msg});
        $message.val('');
    }
});

// Socket listeners
socket.on('chatMessage', function(msg) {
    var html = '<li>' + msg + '</li>';
    $messages.append(html);
    $messages.animate({ scrollTop: $messages[0].scrollHeight }, 50);
});

socket.on('privateMessage', function(msg) {
    var html = '<li class="pm">' + msg + '</li>';
    $messages.append(html);
    $messages.animate({ scrollTop: $messages[0].scrollHeight }, 50);
});

socket.on('populateUserList', function(clients) {
    var html = '';
    for (var name in clients) {
        if(clients.hasOwnProperty(name)) {
            html += '<li>' + name + '</li>';
        }
    }
    $userList.html(html);
});
socket.on('userLeft', function() {
    // $userList
});