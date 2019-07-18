const Config = require('./config/config.json');
const http = require('./config/express').http;
const io = require('./config/socket.io').io;

http.listen(Config.PORT, () => {
    console.log('############################ ############################ ############################ ############################');
    console.log('Started since: ' + new Date().toISOString());
    console.log('Environement: ' + Config.NODE_ENV);
    console.log('Debug ' + (Config.DEBUG ? 'ON' : 'OFF'));
    console.log('Xangle Plugin server started on port ' + Config.PORT);
    console.log('############################ ############################ ############################ ############################');

    require('./route/index');
    require('./socket/index');
});