var stressTestModule = {
    trigger_interval: null,
    status: {
        shot_counter: 0,
        started: false,
        camera_count: 0,
        waiting_for_content: false
    },
    cameras: [],
    order: null,
    trigger_interval_time: 10000, //10 sec, 
    save_frequency: 100
}
module.exports = stressTestModule;
var global_config = require("../../config/config.json");
const io = require('../../config/socket.io').io;
var router = require("../../route");
var xangle = require("../../xangle_api");
const chalk = require("chalk")
const async_module = require("async");


stressTestModule.enabled = global_config.stress_test && global_config.stress_test.enabled;
if (global_config.stress_test && global_config.stress_test.trigger_interval) {
    stressTestModule.trigger_interval_time = global_config.stress_test.trigger_interval;
}

if (global_config.stress_test && global_config.stress_test.save_frequency) {
    stressTestModule.save_frequency = global_config.stress_test.save_frequency;
}


if (!stressTestModule.enabled) {
    return;
}

if (router) {
    global.logger.debug("Setting HTTP routes for stress_test plugin");
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
// Start sending triggers at a regular interval. Automatically called upon startup if autostart is true
// Can be invoked via REST get call @ http://localhost:9092/api/stress/start
stressTestModule.start = function () {
    global.logger.info(chalk.yellow("=== Starting stress test module === "));
    global.logger.info("Trigger interval is: " + chalk.green(stressTestModule.trigger_interval_time) + " ms - save fequency: " + chalk.green(stressTestModule.save_frequency));
    stressTestModule.status.started = true;
    stressTestModule.status.shot_counter = 0;

    if (stressTestModule.trigger_interval) {
        clearInterval(stressTestModule.trigger_interval);
    }
    stressTestModule.trigger_interval = setInterval(() => {
        stressTestModule.mainLoop((error) => {
            if (error) {
                stressTestModule.reportError(error.message ? error.message:error);
            }
        })
    }, stressTestModule.trigger_interval_time)
}

// Stop sending triggers to XCS
// Can be invoked via REST get call @ http://localhost:9092/api/stress/stop
stressTestModule.stop = function () {
    global.logger.info("Stopping stress test module");
    stressTestModule.status.started = false;
    stressTestModule.status.shot_counter = 0;
    if (stressTestModule.trigger_interval) {
        clearInterval(stressTestModule.trigger_interval);
    }
}

// Stop the stress test if the corresponding option is enabled
stressTestModule.reportError = function (error_message) {
    global.logger.error(error_message.message ? error_message.message : error_message);
    if (global_config.stress_test && global_config.stress_test.stop_on_error) {
        stressTestModule.stop();
    }
}

// Stop the stress test if the corresponding option is enabled
stressTestModule.reportSuccess = function () {
}


stressTestModule.reportWarning = function (message) {
    global.logger.warn(message);
}


//Retrieve the list of cameras from XCS
stressTestModule.getCameras = async function (callback) {
    xangle.getCameras((err, cameras) => {
        if (!err && cameras != null) {
            stressTestModule.cameras = cameras;
        }
        return callback(err, cameras);
    });
}

//Retrieve information about camera order and expected camera serials
stressTestModule.getCameraOrder = async function (callback) {
    xangle.getCameraOrder((err, order) => {
        if (!err && order != null) {
            stressTestModule.order = order;
        }
        return callback(err, order);
    });
}

stressTestModule.trigger = async function(callback){
    xangle.trigger({},(trigger_error) => {
        if (trigger_error) {
            return callback(new Error("Failed to trigger cameras: " + trigger_error))
        }
        stressTestModule.status.shot_counter++;
        stressTestModule.status.waiting_for_content = true;
        global.logger.info("[STRESS TEST] Waiting for shot #" + "{" + stressTestModule.status.shot_counter + "}");
        return callback();
    });
}

// Update the list of cameras (for content checking) and send a trigger signal
// Change the module state to "waiting for new content"
stressTestModule.mainLoop = async function (callback) {

    if (stressTestModule.status.waiting_for_content) {
        return callback(new Error("Did not retrieve file from previous trigger !"))
    }
    stressTestModule.getAndCheckCameraInfo((err) => {
        if(err) { return callback(err); }
        stressTestModule.trigger( (trigger_error) =>{
            return callback(trigger_error);
        })
    });
}

// Make sure that the list of cameras is consistent with what was there when we assigned an order
stressTestModule.getAndCheckCameraInfo = function (callback) {
    stressTestModule.getCameraOrder( (err, order) =>{
        if(err || order == null){
            return callback(new Error("Could not retrieve camera ordering info from server"));
        }
        global.logger.info("[STRESS TEST] Xangle CS is reporting: " + order.connected_count + " connected camera(s) / " + order.expected_count + " expected");
        var missing_cams = order.missing_cameras && order.missing_cameras.length ? order.missing_cameras : [];
        if(order.connected_count != order.expected_count || missing_cams.length){
            var errorMessage = "Camera list inconsistency detected: " + JSON.stringify(order, null, 4);
            return callback(new Error(errorMessage));
        }
        return callback();
    })
}

// Make sure that the new files are consistent with the cameras that are currently connected
stressTestModule.checkContent = function (content, callback) {
    global.logger.info("[STRESS TEST] checking content: " + "{" + stressTestModule.status.shot_counter + "} - " + content.timestamp);
    if (content.original_files == null || !content.original_files.length) {
        return callback(new Error("No files reference in the published content metadata"));
    }
    if (!stressTestModule.order || !stressTestModule.order.expected_count) {
        return callback(new Error("No known cameras. Cannot check content"));
    }
    let expected_indices = [];

    // push the camera indices of all the known cameras in a list
    for(let i = 0; i < stressTestModule.order.expected_count; ++i ){
        expected_indices.push( i + 1);
    }

    // and remove the corresponding index once we've found the matching file in the published content
    content.original_files.forEach((file_meta) => {
        expected_indices = expected_indices.filter((idx) => { return idx != file_meta.camera_index; })
    })

    // Report error if there is missing file(s)
    if (expected_indices.length > 0) {
        return callback(new Error("Missing file for cameras: " + expected_indices));
    }
    return callback();
}


// Callback activated when XCS just published some new content
xangle.on("new_content", (content) => {
    global.logger.info("[STRESS TEST] received new content: " + "{" + stressTestModule.status.shot_counter + "} - " + content.timestamp);
    if (!stressTestModule.status.waiting_for_content) {
        return stressTestModule.reportError(new Error("No new content was expected, something went wrong..."));
    };
    if (content.timestamp) {
        stressTestModule.checkContent(content, (content_error) => {
            stressTestModule.status.waiting_for_content = false;
            if (content_error) {
                stressTestModule.reportError(content_error)
            } else {
                global.logger.info(chalk.green("[STRESS TEST] CHECK Passed for shot #" + stressTestModule.status.shot_counter + " - " + content.timestamp))
                stressTestModule.reportSuccess();
            }
            if(stressTestModule.status.shot_counter % stressTestModule.save_frequency != 0){
                xangle.deleteContent(content.timestamp, (err) => {

                });
            }
           else{
               global.logger.info("[STRESS TEST] Saving shot #" + stressTestModule.status.shot_counter + " - " + content.timestamp);
           }
        })
    }
})


if (global_config.stress_test && global_config.stress_test.autostart) {
    stressTestModule.start();
}


