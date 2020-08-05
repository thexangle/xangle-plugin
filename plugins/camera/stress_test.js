var stressTestModule = {
    trigger_interval: null,
    status: {
        shot_counter: 0,
        started: false,
        camera_count: 0,
        waiting_for_content: false
    },
    cameras: [],
    trigger_interval_time: 10000 //10 sec
}
module.exports = stressTestModule;
var global_config = require("../../config/config.json");
const io = require('../../config/socket.io').io;
var router = require("../../route");
var xangle = require("../../xangle_api");
const chalk = require("chalk")


stressTestModule.enabled = global_config.stress_test && global_config.stress_test.enabled;
if(global_config.stress_test && global_config.stress_test.trigger_interval){
    stressTestModule.trigger_interval_time = global_config.stress_test.trigger_interval;
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
    global.logger.info("Trigger interval is: " + chalk.green(stressTestModule.trigger_interval_time + " ms"));
    stressTestModule.status.started = true;
    stressTestModule.status.shot_counter = 0;

    if (stressTestModule.trigger_interval) {
        clearInterval(stressTestModule.trigger_interval);
    }
    stressTestModule.trigger_interval = setInterval(() => {
        stressTestModule.trigger((error) => { if (error) { stressTestModule.reportError(error); } })
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
stressTestModule.reportError = function (error) {
    global.logger.error(error);
    if (global_config.stress_test && global_config.stress_test.stop_on_error) {
        stressTestModule.stop();
    }
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

// Update the list of cameras (for content checking) and send a trigger signal
// Change the module state to "waiting for new content"

stressTestModule.trigger = function (callback) {
    // update camera list before trigger
    stressTestModule.getCameras((err, cameras) => {
        if (err || !cameras) {
            stressTestModule.reportWarning("Failed to retrieve camera list from XangleCS");
            return callback();
        }
        if (stressTestModule.status.waiting_for_content) {
            return callback(new Error("Did not retrieve file from previous trigger !"))
        }
        var camera_count = cameras ? cameras.length : 0;
        global.logger.info("[STRESS TEST] Xangle CS is reporting: " + camera_count + " connected camera(s)");
        xangle.trigger((trigger_error) => {
            if (trigger_error) {
                return callback(new Error("Failed to trigger cameras: " + trigger_error))
            }
            stressTestModule.status.shot_counter++;
            stressTestModule.status.waiting_for_content = true;
            global.logger.info("[STRESS TEST] Waiting for shot #" + "{" + stressTestModule.status.shot_counter + "}");
        });
    });
}

// Make sure that the new files are consistent with the cameras that are currently connected
stressTestModule.checkContent = function (content, callback) {
    global.logger.info("[STRESS TEST] checking content: " + "{" + stressTestModule.status.shot_counter + "} - " + content.timestamp);
    if (content.original_files == null || !content.original_files.length) {
        return callback(new Error("No files reference in the published content metadata"));
    }
    if (!stressTestModule.cameras) {
        return callback(new Error("No known cameras. Cannot check content"));
    }
    let expected_indices = [];

    // push the camera indices of all the known cameras in a list
    stressTestModule.cameras.forEach((camera) => {
        expected_indices.push(camera.order);
    })

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
    global.logger.info("[STRESS TEST] received new content: " + "{" + stressTestModule.status.shot_counter + "} - "  + content.timestamp);
    if (!stressTestModule.status.waiting_for_content) {
        return stressTestModule.reportError(new Error("No new content was expected, something went wrong..."));
    };
    if (content.timestamp) {
        stressTestModule.checkContent(content, (content_error) => {
            stressTestModule.status.waiting_for_content = false;
            if (content_error) {
                stressTestModule.reportError(content_error)
            }else{
                global.logger.info(chalk.green("[STRESS TEST] CHECK Passed for shot #" + stressTestModule.status.shot_counter + " - " + content.timestamp))
            }
            xangle.deleteContent(content.timestamp, (err) => {

            });
        })
    }
})


if (global_config.stress_test && global_config.stress_test.autostart) {
    stressTestModule.start();
}


