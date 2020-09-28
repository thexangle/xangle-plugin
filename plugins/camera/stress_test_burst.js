const cliProgress = require('cli-progress');
var stressTestBurstModule = {
    burst_cooldown: 60000,
    burst_count:5,
    burst_delay: 100,
    status: {
        shot_counter: 0,
        burst_counter: 0,
        started: false,
        camera_count: 0,
        waiting_for_content: 0
    },
    cameras: [],
    order: null,
    capture_timeout: 10000, //10 sec, 
    capture_timeout_timer: null,
    save_frequency: 100
}
module.exports = stressTestBurstModule;
var global_config = require("../../config/config.json");
const io = require('../../config/socket.io').io;
var router = require("../../route");
var xangle = require("../../xangle_api");
const chalk = require("chalk")
const async_module = require("async");


stressTestBurstModule.enabled = global_config.stress_test_burst && global_config.stress_test_burst.enabled;
if (global_config.stress_test_burst && global_config.stress_test_burst.capture_timeout) {
    stressTestBurstModule.capture_timeout = global_config.stress_test_burst.capture_timeout;
}

if (global_config.stress_test_burst && global_config.stress_test_burst.save_frequency) {
    stressTestBurstModule.save_frequency = global_config.stress_test_burst.save_frequency;
}

if (global_config.stress_test_burst && global_config.stress_test_burst.burst_cooldown) {
    stressTestBurstModule.burst_cooldown = global_config.stress_test_burst.burst_cooldown;
}

if (global_config.stress_test_burst && global_config.stress_test_burst.burst_delay) {
    stressTestBurstModule.burst_delay = global_config.stress_test_burst.burst_delay;
}

if (global_config.stress_test_burst && global_config.stress_test_burst.burst_count) {
    stressTestBurstModule.burst_count = global_config.stress_test_burst.burst_count;
}

if (!stressTestBurstModule.enabled) {
    return;
}

if (router) {
    global.logger.debug("Setting HTTP routes for stress_test plugin");
    router.get('/stress_burst/start', function (req, res) {
        stressTestBurstModule.start();
        res.success('stress test starting');
    });
    router.get('/stress_burst/stop', function (req, res) {
        stressTestBurstModule.stop();
        res.success('stress test stopping');

    });
    router.get('/stress_burst/status', function (req, res) {
        res.json(stressTestBurstModule.status);

    });
}
// Start sending triggers at a regular interval. Automatically called upon startup if autostart is true
// Can be invoked via REST get call @ http://localhost:9092/api/stress/start
stressTestBurstModule.start = function () {
    global.logger.info(chalk.yellow("=== Starting stress test (BURST) module === "));
    global.logger.info("Burst interval is: " + chalk.green(stressTestBurstModule.burst_delay) + " ms - save fequency: " + chalk.green(stressTestBurstModule.save_frequency));
    stressTestBurstModule.status.started = true;
    stressTestBurstModule.status.shot_counter = 0;
    stressTestBurstModule.mainLoop();
}

// Stop sending triggers to XCS
// Can be invoked via REST get call @ http://localhost:9092/api/stress/stop
stressTestBurstModule.stop = function () {
    global.logger.info("Stopping stress test module");
    stressTestBurstModule.status.started = false;
    stressTestBurstModule.status.shot_counter = 0;
}

// Stop the stress test if the corresponding option is enabled
stressTestBurstModule.reportError = function (error_message) {
    global.logger.error(error_message.message ? error_message.message : error_message);
    if (global_config.stress_test_burst && global_config.stress_test_burst.stop_on_error) {
        stressTestBurstModule.stop();
    }
}

// Stop the stress test if the corresponding option is enabled
stressTestBurstModule.reportSuccess = function () {

}


stressTestBurstModule.reportWarning = function (message) {
    global.logger.warn(message);
}


//Retrieve the list of cameras from XCS
stressTestBurstModule.getCameras = async function (callback) {
    xangle.getCameras((err, cameras) => {
        if (!err && cameras != null) {
            stressTestBurstModule.cameras = cameras;
        }
        return callback(err, cameras);
    });
}

//Retrieve information about camera order and expected camera serials
stressTestBurstModule.getCameraOrder = async function (callback) {
    xangle.getCameraOrder((err, order) => {
        if (!err && order != null) {
            stressTestBurstModule.order = order;
        }
        return callback(err, order);
    });
}

stressTestBurstModule.trigger = async function (callback) {
    xangle.trigger((trigger_error) => {
        if (trigger_error) {
            return callback(new Error("Failed to trigger cameras: " + trigger_error))
        }
        stressTestBurstModule.status.waiting_for_content++;
        global.logger.info("[STRESS TEST] Waiting for shot - " + stressTestBurstModule.status.waiting_for_content + " in waiting line" );
        return callback();
    });
}

// Update the list of cameras (for content checking) and send a trigger signal
// Change the module state to "waiting for new content"
stressTestBurstModule.mainLoop = function () {
    if(!stressTestBurstModule.status.started){
        return;
    }
    if (stressTestBurstModule.status.waiting_for_content > 0) {
        stressTestBurstModule.reportError(new Error("Did not retrieve all the files from previous triggers !"));
        return;
    }
    stressTestBurstModule.burstLoop((err) => {
        if (!err) {
            stressTestBurstModule.status.burst_counter++;
            // create a new progress bar instance and use shades_classic theme
            let bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            global.logger.info("[STRESS TEST] WAITING for next Burst sequence")
            // start the progress bar with a total value of 200 and start value of 0
            bar1.start(stressTestBurstModule.burst_cooldown, 0);
            let start = new Date();

            let progressInterval = setInterval( () =>{
                bar1.update(new Date() - start);
            },500);
            // stop the progress bar
           
            setTimeout(() => {
                
                clearInterval(progressInterval);
                bar1.stop();
               // global.logger.info("[STRESS TEST] starting new burst sequence (" + stressTestBurstModule.status.burst_counter + ")")
                stressTestBurstModule.mainLoop();
            }, stressTestBurstModule.burst_cooldown);
        }
    })
}

stressTestBurstModule.wait_for_capture = function (callback) {

    stressTestBurstModule.startCaptureTimeout((err) => {
        //timeout reached :(
        if (err) {
            if (stressTestBurstModule.wait_capture_interval) {
                clearInterval(stressTestBurstModule.wait_capture_interval);
            }
            return callback(err);
        }
    });
    if (stressTestBurstModule.wait_capture_interval) {
        clearInterval(stressTestBurstModule.wait_capture_interval);
    }
    stressTestBurstModule.wait_capture_interval = setInterval(() => {
        if (stressTestBurstModule.status.waiting_for_content <= 0) {
            stressTestBurstModule.stopCaptureTimeout();
            clearInterval(stressTestBurstModule.wait_capture_interval);
            return callback();
        }
        else if (stressTestBurstModule.resetTimeoutToggle){
            stressTestBurstModule.resetTimeoutToggle = false;
            stressTestBurstModule.startCaptureTimeout((err) => {
                //timeout reached :(
                if (err) {
                    if (stressTestBurstModule.wait_capture_interval) {
                        clearInterval(stressTestBurstModule.wait_capture_interval);
                    }
                    return callback(err);
                }
            });
        }
    }, 300);

}

stressTestBurstModule.startCaptureTimeout = function (cb) {
    stressTestBurstModule.stopCaptureTimeout();
    stressTestBurstModule.capture_timeout_timer = setTimeout(() => {
        return cb(new Error("Capture timeout reached !"));
    }, stressTestBurstModule.capture_timeout)
}

stressTestBurstModule.stopCaptureTimeout = function () {
    if (stressTestBurstModule.capture_timeout_timer) {
        clearTimeout(stressTestBurstModule.capture_timeout_timer);
    }
}
// do a set of X triggers in quick succession
stressTestBurstModule.burstLoop = async function (callback) {

    if (stressTestBurstModule.status.waiting_for_content > 0) {
        return callback(new Error("Did not retrieve all shots from previous burst. Missing: " + stressTestBurstModule.status.waiting_for_content ))
    }
    var tasks = [];
    tasks.push((taskcb) => { return taskcb(!stressTestBurstModule.status.started ? new Error("Test stopped") : null)})
    tasks.push((taskcb) => { stressTestBurstModule.getAndCheckCameraInfo(taskcb); })
    tasks.push((taskcb) => { xangle.toggleAutoIncrement(true, taskcb); })
    for (let i = 0; i < stressTestBurstModule.burst_count; ++i) {
        tasks.push((taskcb) => { global.logger.info("BURST #" + i); return taskcb(); })
        //tasks.push((taskcb) => { return taskcb(stressTestBurstModule.status.waiting_for_content ? new Error("Did not retrieve file from previous trigger !") : null) });
        tasks.push((taskcb) => { stressTestBurstModule.trigger(taskcb); })
        tasks.push((taskcb) => { setTimeout( () => { return taskcb(); } , stressTestBurstModule.burst_delay)});
    }
    tasks.push((taskcb) => { stressTestBurstModule.wait_for_capture(taskcb); })

    async_module.series(tasks, (err) => {
        if (err) {
            stressTestBurstModule.reportError(err);
        }
        return callback(err);
    })
}

// Make sure that the list of cameras is consistent with what was there when we assigned an order
stressTestBurstModule.getAndCheckCameraInfo = function (callback) {
    stressTestBurstModule.getCameraOrder((err, order) => {
        if (err || order == null) {
            return callback(new Error("Could not retrieve camera ordering info from server"));
        }
        global.logger.info("[STRESS TEST] Xangle CS is reporting: " + order.connected_count + " connected camera(s) / " + order.expected_count + " expected");
        var missing_cams = order.missing_cameras && order.missing_cameras.length ? order.missing_cameras : [];
        if (order.connected_count != order.expected_count || missing_cams.length) {
            var errorMessage = "Camera list inconsistency detected: " + JSON.stringify(order, null, 4);
            return callback(new Error(errorMessage));
        }
        return callback();
    })
}

// Make sure that the new files are consistent with the cameras that are currently connected
stressTestBurstModule.checkContent = function (content, callback) {
    global.logger.info("[STRESS TEST] checking content: " + content.timestamp);
    if (content.original_files == null || !content.original_files.length) {
        return callback(new Error("No files reference in the published content metadata"));
    }
    if (!stressTestBurstModule.order || !stressTestBurstModule.order.expected_count) {
        return callback(new Error("No known cameras. Cannot check content"));
    }
    let expected_indices = [];

    // push the camera indices of all the known cameras in a list
    for (let i = 0; i < stressTestBurstModule.order.expected_count; ++i) {
        expected_indices.push(i + 1);
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
    stressTestBurstModule.status.shot_counter++;
    global.logger.info("[STRESS TEST] received new content: " + "{" + stressTestBurstModule.status.shot_counter + "} - " + content.timestamp);
    if (stressTestBurstModule.status.waiting_for_content <= 0) {
        return stressTestBurstModule.reportError(new Error("No new content was expected, something went wrong..."));
    };
    //reset timeout
    stressTestBurstModule.resetTimeoutToggle = true;

    if (content.timestamp) {
        stressTestBurstModule.checkContent(content, (content_error) => {
            stressTestBurstModule.status.waiting_for_content--;
            if (content_error) {
                stressTestBurstModule.reportError(content_error)
            } else {
                global.logger.info(chalk.green("[STRESS TEST] CHECK Passed for shot #" + stressTestBurstModule.status.shot_counter + " - " + content.timestamp))
                stressTestBurstModule.reportSuccess();
            }
            if (stressTestBurstModule.status.shot_counter % stressTestBurstModule.save_frequency != 0) {
                xangle.deleteContent(content.timestamp, (err) => {

                });
            }
            else {
                global.logger.info("[STRESS TEST] Saving shot #" + stressTestBurstModule.status.shot_counter + " - " + content.timestamp);
            }
        })
    }
})


if (global_config.stress_test_burst && global_config.stress_test_burst.autostart) {
    stressTestBurstModule.start();
}


