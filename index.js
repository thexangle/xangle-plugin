const Config = require('./config/config.json');
const http = require('./config/express').http;
const commander = global.commander ? global.commander : require('commander');

commander.parse(process.argv);

var logLevel = commander.loglevel ? global.commander.loglevel : 'debug';
console.log("loglevel :" + logLevel)
if(!global.logger){
   const loggerModule = require('./config/logger');
   loggerModule.createDefaultLoggers(logLevel);
}



http.listen(Config.PORT, () => {
    global.logger.info('Starting Xangle Plugin on port ' + Config.PORT);
    require('./route/index');
    require('./socket/index');
});