const io = require('../config/socket.io').io;


io.on('connection', function (socket) {
    console.log('new user connected to socket io');
});

io.on('share_request', (request) => { 
    global.logger.verbose(' Received share request: ' + JSON.stringify(request, null, 4));
    plugins.share.forEach((plugin) => {
        plugin.share(request);
    })
})