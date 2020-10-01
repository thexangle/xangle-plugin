var fs = require('fs');
var plugins = { share: [], camera: [] }
var path = require('path');

var available_share_plugins = [];
var available_camera_plugins = [];
global.logger.info("Loading plugins...")
try{
    available_share_plugins = fs.readdirSync(path.join(__dirname , "share"));
    available_camera_plugins = fs.readdirSync(path.join(__dirname , "camera"));
}catch(e){
    global.logger.error("ERROR: failed to read plugin folder: ", e)
}

available_share_plugins.forEach( (file) => { 
    try{
        var plugin = require("./share/"+file);
        if(plugin && plugin.share != undefined && plugin.enabled){
            global.logger.info("SHARE plugin: ", file, " loaded")
            plugins.share.push(plugin);
        }
    }catch(e){
        global.logger.error("failed to load plugin: " + file, " -> " + e);
    }
});

available_camera_plugins.forEach( (file) =>{ 
    try{
        var plugin = require(path.join(__dirname, "camera", file));
        if(plugin && plugin.enabled){
            global.logger.info("Camera plugin: " + file + " loaded");
            plugins.camera.push(plugin);
        }
    }catch(e){
        global.logger.info("failed to load plugin: " + file + " -> " + e);
    }
});



module.exports = plugins;