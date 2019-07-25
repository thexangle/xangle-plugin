const Config = require('./config/config.json');
const http = require('./config/express').http;
const io = require('./config/socket.io').io;

if(!global.logger){
    global.logger = { 
        info: (...txt) => { console.log(txt.join(" ")); },
        warn: (...txt) => { console.log(txt.join(" ")); },
        debug: (...txt) => { console.log(txt.join(" ")); },
        verbose: (...txt) => { console.log(txt.join(" ")); },
        error: (...txt) => { console.log(txt.join(" ")); } 
    }
}



http.listen(Config.PORT, () => {
    global.logger.info('Starting Xangle Plugin started on port ' + Config.PORT);

    require('./route/index');
    require('./socket/index');
});