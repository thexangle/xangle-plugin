const Config = require('./config.json');
const http = require('./express').http;
const socket_io_client = require('socket.io-client');

var server_url = Config.socket_io_server_url ? Config.socket_io_server_url : "http://localhost:8091"

const io = socket_io_client(server_url + "/callbacks", {
    // Socket.io options here
});



exports.io = io;