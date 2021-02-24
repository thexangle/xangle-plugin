var TriggerObserverPlugin = {}

module.exports = TriggerObserverPlugin;

const global_config = require("../../config/config.json");
const xangle = require("../../xangle_api");
const async_module = require("async");
const request = require('request')

const testURL = 'https://httpbin.org/anything?cmd=GPIO,12,1'

TriggerObserverPlugin.trigger_countdown_in_progress = false;

let doGetRequest = function (callback) {
    request.get(testURL, (err, res) => {
        if(err) { global.logger.error("[TRIGGER OBSERVER] Failed to send request to: " + url); }
        else{
            global.logger.debug("HTTP request sent (" + testURL +")");
            //global.logger.debug("[TRIGGER OBSERVER] GET response: " + res.body);
        }
        return callback ? callback(err,res) : null; 
    });
}

xangle.on("trigger_countdown_progress", (data) =>{

    if(data.remaining != undefined && data.remaining  <= 0){
        TriggerObserverPlugin.trigger_countdown_in_progress = false;
        global.logger.info("[TRIGGER OBSERVER] trigger countdown finished");
    }
    else if(!TriggerObserverPlugin.trigger_countdown_in_progress){
        TriggerObserverPlugin.trigger_countdown_in_progress = true;
        var message = "[TRIGGER OBSERVER] trigger countdown started ";
        if(data.remaining != undefined) {
            message+= "" + data.remaining + " ms before trigger";
        }
        global.logger.info(message);
        doGetRequest();
    }
   
});