
var ProjectorPlugin = {}

module.exports = ProjectorPlugin;

const global_config = require("../../config/config.json");
const xangle = require("../../xangle_api");
const async_module = require("async");

ProjectorPlugin.server_info = null;
ProjectorPlugin.connection_interval = setInterval(() => {
    xangle.getServerInfo((err, info) => {
        global.logger.info("Trying to connect to server ...");
        if (info) {
            ProjectorPlugin.server_info = info;
            ProjectorPlugin.server_url = "http://" + info.ip + ":" + info.port;
            global.logger.info("Connected to server at: " + ProjectorPlugin.server_url);
            clearInterval(ProjectorPlugin.connection_interval);
            async_module.series( [
                (cb) => { ProjectorPlugin.UploadProjectorImage(cb)},
                (cb) => { ProjectorPlugin.SetProjectorImageOnClients(cb)},
                (cb) => { ProjectorPlugin.Wait(1000, cb) },
                (cb) => { ProjectorPlugin.TestProjector(cb) },
                (cb) => { ProjectorPlugin.Wait(5000, cb) },
                (cb) => { ProjectorPlugin.TestProjector2(cb) },
            ])
        }
    })
}, 5000)

ProjectorPlugin.UploadProjectorImage = function (callback) {
    xangle.uploadAsset("projector", global_config.projector.image_path, callback);
}

ProjectorPlugin.Wait = function (delay, callback) {
   setTimeout( () =>{return callback()}, delay)
}

ProjectorPlugin.SetProjectorImageOnClients = function (callback) {
    xangle.sendCommand(
        {
            command: "set_projector_image",
            url: ProjectorPlugin.server_url + "/assets/files/projector/projector.png"
        }, callback);
}

ProjectorPlugin.TriggerWithProjector = function (callback) {
    xangle.trigger({use_projector: "1"}, callback);
}

ProjectorPlugin.Trigger = function (callback) {
    xangle.trigger({}, callback);
}


ProjectorPlugin.PrepareTrigger = function (callback) {
    xangle.prepare_trigger({}, callback);
}

ProjectorPlugin.ToggleProjectorDisplay = function (toggle, callback) {
    xangle.sendCommand(
        {
            command: toggle ? "display_projector_image" : "clear_projector_image",
        }, callback);
}


ProjectorPlugin.TestProjector = function (callback) {

    var tasks = [];

    tasks.push((cb) => { ProjectorPlugin.PrepareTrigger(cb) });
    tasks.push((cb) => { ProjectorPlugin.Wait(500, cb) });
    tasks.push((cb) => { ProjectorPlugin.TriggerWithProjector(cb) });

    async_module.series(tasks, (err) => {
        if (err) { global.logger.error(err); }
        return callback(err)
    })
}


ProjectorPlugin.TestProjector2 = function (callback) {

    var tasks = [];
    tasks.push((cb) => { ProjectorPlugin.PrepareTrigger(cb) });
    tasks.push((cb) => { ProjectorPlugin.ToggleProjectorDisplay(true, cb) });
    tasks.push((cb) => { ProjectorPlugin.Wait(500, cb) });
    tasks.push((cb) => { ProjectorPlugin.Trigger(cb) });
    tasks.push((cb) => { ProjectorPlugin.ToggleProjectorDisplay(false,cb) });

    async_module.series(tasks, (err) => {
        if (err) { global.logger.error(err); }
        return callback(err)
    })
}