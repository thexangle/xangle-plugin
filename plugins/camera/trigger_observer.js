var TriggerObserverPlugin = {}

module.exports = TriggerObserverPlugin;

const global_config = require("../../config/config.json");
const xangle = require("../../xangle_api");
const async_module = require("async");
const request = require('request')

const testURL = 'https://httpbin.org/anything?cmd=GPIO,12,1'

TriggerObserverPlugin.half_press_enabled = false;

TriggerObserverPlugin.enabled = global_config.plugins_to_run && global_config.plugins_to_run.indexOf("trigger_observer") != -1;

if (!TriggerObserverPlugin.enabled) {
    return;
}

xangle.on("trigger", (info) =>{
    global.logger.info("[TRIGGER OBSERVER] Xangle trigger scheduled in: " + info.delay + " ms");
    TriggerObserverPlugin.half_press_enabled = false;
})

xangle.on("half_press", (info) =>{
    global.logger.info("[TRIGGER OBSERVER] Xangle half_press scheduled in: " + info.delay + " ms");
    if(!TriggerObserverPlugin.half_press_enabled){
        TriggerObserverPlugin.half_press_enabled = true;
        request.get(testURL, (err, res) => {
            if(err) { global.logger.error("[TRIGGER OBSERVER] Failed to send request to: " + url); }
            else{
                global.logger.debug("HTTP request sent (" + testURL +")");
                //global.logger.debug("[TRIGGER OBSERVER] GET response: " + res.body);
            }
        });
    }
})
