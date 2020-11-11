const EventEmitter = require('events');
var xangleApiModule = new EventEmitter();

var global_config = require("../config/config.json");
const io = require('../config/socket.io').io;
const udp = require('../udp');
var router = require("../route");
var server_url = global_config.socket_io_server_url ? global_config.socket_io_server_url : "http://localhost:8091"
const request = require('request');
const async = require('async');
const fs = require('fs');

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

xangleApiModule.getServerInfo = function (callback) {
    request.get(server_url + "/api/server_info", (err, res) => {
        if(err || !res || !res.body) { return callback(err) }
        return callback(err, JSON.parse(res.body));
    });
}

xangleApiModule.trigger = function (params, callback) {
    global.logger.verbose("[Xangle API] Sending trigger signal");
    request.post(server_url + "/api/trigger", {
        json: params ? params : {}
    }, (error, res /*, body*/) => {
        global.logger.verbose("[Xangle API] Sent trigger command... ");
        return callback ? callback(error, res) : null;
    });
}

xangleApiModule.prepare_trigger = function (params, callback) {
    global.logger.verbose("[Xangle API] Sending prepare trigger signal");
    request.post(server_url + "/api/prepare_trigger", {
        json: params ? params : {}
    }, (error, res /*, body*/) => {
        global.logger.verbose("[Xangle API] Sent prepare_trigger command... ");
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

xangleApiModule.toggleAutoIncrement = function (toggle, callback) {
    let command = { command: toggle ? "enable_auto_sequence_increment" : "disable_auto_sequence_increment" };
    request.post(server_url + "/api/send_command", {
        json: command
    }, (reqError, res /*, body*/) => {
        var cberr = null;
        var success = res && res.body && !res.body.err && res.body.success == true;
        global.logger.verbose("[Xangle API] Sent auto increment toggle: " + toggle);
        if(reqError || !success){
            global.logger.warn("[Xangle API] failed to toggleAutoIncrement: "+ reqError);
            cberr = new Error("failed to toggleAutoIncrement: ", + reqError);
        }
        else{
        }
        return callback ? callback(cberr, null) : null;
    });
}

xangleApiModule.sendCommand = function (command, callback) {
    request.post(server_url + "/api/send_command", {
        json: command
    }, (reqError, res /*, body*/) => {
        var cberr = null;
        var success = res && res.body && !res.body.err && res.body.success == true;
        global.logger.verbose("[Xangle API] Sent command: " + JSON.stringify(command, null, 4));
        if(reqError || !success){
            global.logger.warn("[Xangle API] failed to send command: "+ reqError);
            cberr = new Error("failed to send command: ", + reqError);
        }
        else{
        }
        return callback ? callback(cberr, null) : null;
    });
}


xangleApiModule.uploadAsset = function(asset_name, filepath, callback) {

    var options = {
        asset_name: asset_name,
        file: fs.createReadStream(filepath)
    }
    
    request.post({url: server_url + "/api/asset/upload", formData: options}, (reqError, res /*, body*/) => {
        var cberr = null;
        var res_body = res && res.body ? JSON.parse(res.body) : null;
        var success = res_body && !res_body.err && res_body.success == true;
        global.logger.verbose("[Xangle API] Sent asset: " + res_body.data.filename);
        if(reqError || !success){
            global.logger.warn("[Xangle API] failed to send asset: "+ reqError);
            cberr = new Error("failed to send asset: " + reqError);
        }
        else{
            global.logger.verbose("[Xangle API] response: " + JSON.stringify(res_body.data)); 
        }
        return callback ? callback(cberr, res_body ? res_body.data : null) : null;
    });
  }

io.on('new_content', (content) => { 
    xangleApiModule.emit("new_content", content);
})

udp.on('command', (command) =>{
    let trigger_delay = -1;
    let half_press_delay = -1;
    // Xangle typically sends sets of commands to the camera including the actual trigger in the form of a "Press full" signal
    if(command.command == "trigger" || (command.command == "setSetting" && command.setting == "eosremoterelease" && command.value == "Press Full")){
        trigger_delay = command.delay ? command.delay : 0;
        xangleApiModule.emit("trigger", { delay: trigger_delay, commands: [command]} );
    }
    else if(command.command == "setSetting" && command.setting == "eosremoterelease" && command.value == "Press Half"){
        half_press_delay = command.delay ? command.delay : 0;
        xangleApiModule.emit("half_press", { delay: half_press_delay, commands:  [command] } );
    }
});
udp.on('commands', (commands_array) =>{
    let trigger_delay = -1;
    let half_press_delay = -1;
    // Xangle typically sends sets of commands to the camera including the actual trigger in the form of a "Press full" signal
    commands_array.commands.forEach((command) =>{
        if(command.command == "setSetting" && command.setting == "eosremoterelease" && command.value == "Press Full"){
            trigger_delay = command.delay ? command.delay : 0;
        }
        else if(command.command == "setSetting" && command.setting == "eosremoterelease" && command.value == "Press Half"){
            half_press_delay = command.delay ? command.delay : 0;
        }
        if(command.command == "trigger"){
            trigger_delay = command.delay ? command.delay : 0;
        }
    })
    if(trigger_delay >= 0){
        // Notify plugins that a trigger is pending
        xangleApiModule.emit("trigger", { delay: trigger_delay, commands: commands_array } );
    }
    if(half_press_delay >= 0){
        // Notify plugins that a half_press is pending
        xangleApiModule.emit("half_press", { delay: half_press_delay, commands: commands_array } );
    }
})


module.exports = xangleApiModule;