const io = require('../config/socket.io').io;

io.on('connection', function (socket) {
    console.log('new user connect to socket io');
});