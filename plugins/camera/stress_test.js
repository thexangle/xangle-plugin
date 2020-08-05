var stressTestModule = { 
    trigger_interval: null, 
    status: {
        shot_counter: 0,
        started: false, 
        camera_count: 0,
        waiting_for_content: false
    } 
}
module.exports = stressTestModule;
var global_config = require("../../config/config.json");
const io = require('../../config/socket.io').io;
var router = require("../../route");
var xangle = require("../../xangle_api");


stressTestModule.enabled = global_config.stress_test && global_config.stress_test.enabled;
if(!stressTestModule.enabled){
    return;
}

if(router){
    console.log("Setting HTTP routes for stress_test plugin");
    router.get('/stress/start', function (req, res) {
        stressTestModule.start();
        res.success('stress test starting');
        
    });
    router.get('/stress/stop', function (req, res) {
        stressTestModule.stop();
        res.success('stress test stopping');
        
    });
    router.get('/stress/status', function (req, res) {
        res.json(stressTestModule.status);
        
    });
}

stressTestModule.start = function(){
    global.logger.debug("Starting stress test module");
    stressTestModule.status.started = true;
    stressTestModule.status.shot_counter = 0;

    if(stressTestModule.trigger_interval){
        clearInterval(stressTestModule.trigger_interval);
    }
    stressTestModule.trigger_interval = setInterval( () =>{
        stressTestModule.trigger()
    }, 10000)
}


stressTestModule.stop = function(){
    global.logger.debug("Stopping stress test module");
    stressTestModule.status.started = false;
    stressTestModule.status.shot_counter = 0;
    if(stressTestModule.trigger_interval){
        clearInterval(stressTestModule.trigger_interval);
    }
}

stressTestModule.reportError = function(error){
    global.logger.error(error);
}

stressTestModule.trigger = function(callback){
    global.logger.verbose("[STRESS TEST plugin] getting list of cameras: ");
    xangle.getCameras( (err, cameras) => {
        if(err || !cameras){
            stressTestModule.reportError("Failed to retrieve camera list from XangleCS");
            return;
        }
        xangle.trigger( (trigger_error) => {
            if(trigger_error){
                stressTestModule.reportError("Failed to trigger cameras: " + trigger_error);
                return;
            }
            stressTestModule.status.shot_counter++;
            stressTestModule.status.waiting_for_content = true;
        });
    });
}

xangle.on("new_content", (content) =>{
    global.logger.debug("[STRESS TEST] received new content: " + JSON.stringify(content, null, 4));
    if(content.timestamp){
        xangle.deleteContent(content.timestamp, (err) =>{
            
        });
    }

})





