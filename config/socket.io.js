const Config = require('./config.json');
const http = require('./express').http;
const socket_io = require('socket.io');

const io = socket_io(http, {
    // Socket.io options here
});



exports.io = io;