var path = require('path');
var moment = require('moment');
var chalk = require('chalk');
var winston = require('winston');
const { printf } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    var string = `[${moment(timestamp).format('h:mm:ss:SSS')}] [${level}] ${message}`;
 // Return string will be passed to logger.
    if (level == "debug") {
        return chalk.cyan(string);
    } else if (level == "verbose") {
        return chalk.grey(string);
    } else if (level == "warn") {
        return chalk.yellow(string);
    } else if (level == "error") {
        return chalk.red(string);
    } else {
        return string;
    }
});


const myFormat_nocolor = printf(({ level, message, label, timestamp }) => {
    var string = `[${moment(timestamp).format('h:mm:ss:SSS')}] [${level}] ${message}`;
    return string;
});


var loggerModule = {}

loggerModule.timestamp_logger = function () {
    return moment().format('h:mm:ss:SSS a');
};

loggerModule.formatter_logger = function (options) {
    // Return string will be passed to logger.
    if (options.level == "debug") {
        return chalk.cyan('[' + options.timestamp() + '] (' + options.level.toUpperCase() + ') ' + (undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta, null, 4) : ''));
    } else if (options.level == "verbose") {
        return chalk.magenta('[' + options.timestamp() + '] (' + options.level.toUpperCase() + ') ' + (undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta, null, 4) : ''));
    } else if (options.level == "warn") {
        return chalk.yellow('[' + options.timestamp() + '] (' + options.level.toUpperCase() + ') ' + (undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta, null, 4) : ''));
    } else if (options.level == "error") {
        return chalk.red('[' + options.timestamp() + '] (' + options.level.toUpperCase() + ') ' + (undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta, null, 4) : ''));
    } else {
        return '[' + options.timestamp() + '] (' + options.level.toUpperCase() + ') ' + (undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta, null, 4) : '');
    }
};

loggerModule.formatter_logger_no_color = function (options) {
    return '[' + options.timestamp() + '] (' + options.level.toUpperCase() + ') ' + (undefined !== options.message ? options.message.replace(/\u001b\[.*?m/g, '') : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta, null, 4) : '');
};

loggerModule.createDefaultLoggers = function (logLevel) {
    var datetime_file_logger = moment().format('YYYYMMDD_HHmmss');
    var root = process.cwd();
    var logger = winston.createLogger({
        transports: [
            new (winston.transports.Console)({
                level: logLevel,
                timestamp: loggerModule.timestamp_logger,
                formatter: loggerModule.formatter_logger,
                colorize: true,
                json: false,
                format: myFormat,
            }),
            new (winston.transports.File)({
                level: 'debug',
                name: 'info-file',
                timestamp: loggerModule.timestamp_logger,
                formatter: loggerModule.formatter_logger_no_color,
                json: false,
                colorize: false,
                filename: path.join("reports", datetime_file_logger + "_xangle-plugin-logs.txt"),
                format: myFormat_nocolor
            })
        ],
        exceptionHandlers: [
            new winston.transports.File({
                filename: path.join(process.cwd() + "xangle-plugin-crash-report.txt"),
                timestamp: true
            })
        ],
        exitOnError: false,
        emitErrs: false
    });

    global.logger = logger;
    return logger;
}

module.exports = loggerModule;
