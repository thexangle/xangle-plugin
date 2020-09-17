const EventEmitter = require('events');
var xangleApiModule = new EventEmitter();

var global_config = require("../config/config.json");
const io = require('../config/socket.io').io;
var router = require("../route");
var server_url = global_config.socket_io_server_url ? global_config.socket_io_server_url : "http://localhost:8091"
const request = require('request');
const async = require('async');

xangleApiModule.getCameras = function (callback) {
    request.get(server_url + "/api/cameras", (err, res) => {
        if(err) { return callback(err) }
        return callback(err, res && res.body ? JSON.parse(res.body) : null);
    });
}

xangleApiModule.getCameraOrder = function (callback) {
    request.get(server_url + "/api/order/status", (err, res) => {
        if(err) { return callback(err) }
        return callback(err, res && res.body ? JSON.parse(res.body) : null);
    });
}

xangleApiModule.trigger = function (callback) {
    global.logger.verbose("[Xangle API] Sending trigger signal");
    request.post(server_url + "/api/trigger", {
        json: {}
    }, (error, res /*, body*/) => {
        global.logger.verbose("[Xangle API] Sent trigger command... ");
        return callback ? callback(error, res) : null;
    });
}

xangleApiModule.deleteContent = function (timestamp, callback) {
    request.post(server_url + "/api/delete-content", {
        json: { timestamp: timestamp }
    }, (reqError, res /*, body*/) => {
        var cberr = null;
        var success = res && res.body && !res.body.err && res.body.success == true;
        var restimestamp =  res.body && res.body.timestamp ? res.body.timestamp : "unknown";

        global.logger.verbose("[Xangle API] Sent delete command for timestamp: " + restimestamp);
       
        if(reqError || !success){
            global.logger.warn("[Xangle API] failed to delete data with timestamp: ", + restimestamp + ":" + reqError);
            cberr = new Error("failed to delete data with timestamp: ", + restimestamp + ":" + reqError);
        }
        else{
            global.logger.verbose("[Xangle API] deleted data with timestamp: " + restimestamp);
        }
        return callback ? callback(cberr, null) : null;
    });
}

io.on('new_content', (content) => { 
    xangleApiModule.emit("new_content", content);
})

module.exports = xangleApiModule;