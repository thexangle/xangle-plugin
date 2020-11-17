const Config = require('./config/config.json');
const http = require('./config/express').http;
const commander = global.commander ? global.commander : require('commander');

commander.option('-p, --plugin [plugins...]', 'specify which plugin to run. Use basename of plugin (eg: trigger_observer)');
commander.option('-l, --loglevel <level>', 'specify which loglevel to use (default: debug)');
commander.parse(process.argv);

var logLevel = commander.loglevel ? global.commander.loglevel : 'debug';
var plugins_to_load = commander.plugin;
if(!plugins_to_load || plugins_to_load.length == 0){
    //fallback on config
    plugins_to_load = Config ? Config.plugins_to_run : null;
}

console.log("loglevel :" + logLevel)
if(!global.logger){
   const loggerModule = require('./config/logger');
   loggerModule.createDefaultLoggers(logLevel);
}

const plugins = require('./plugins/index.js')


http.listen(Config.PORT, () => {
    global.logger.info('Starting Xangle Plugin on port ' + Config.PORT);
    plugins.load(plugins_to_load, (err) =>{
        if(err) { global.logger.error("Could not load plugins: " + err)}
    });
    require('./route/index');
    require('./socket/index');
});