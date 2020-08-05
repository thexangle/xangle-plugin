const Config = require('./config/config.json');
const http = require('./config/express').http;
const io = require('./config/socket.io').io;
const chalk = require('chalk');

if(!global.logger){
   const loggerModule = require('./config/logger');
   loggerModule.createDefaultLoggers("verbose");
}



http.listen(Config.PORT, () => {
    global.logger.info('Starting Xangle Plugin on port ' + Config.PORT);
    require('./route/index');
    require('./socket/index');
});