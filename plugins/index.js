var fs = require('fs');
var plugins = { share: [], camera: [] }
var path = require('path');

var available_share_plugins = [];
var available_camera_plugins = [];
global.logger.info("Listing plugins...")
try{
    available_share_plugins = fs.readdirSync(path.join(__dirname , "share"));
    available_camera_plugins = fs.readdirSync(path.join(__dirname , "camera"));
}catch(e){
    global.logger.error("ERROR: failed to read plugin folder: " + e)
}
global.logger.info("Available plugins: ")
available_share_plugins.forEach( (plugin) => logger.info("[SHARE] " + path.basename(plugin, ".js")));
available_camera_plugins.forEach( (plugin) => logger.info("[CAMERA] " + path.basename(plugin, ".js")));

plugins.load = async(plugin_list, callback) => {
    if(!plugin_list || plugin_list.length == 0){
        global.logger.error("No plugin specied, please use the --plugin command line option");
        return callback();
    }
    global.logger.info("loading plugin(s): " + JSON.stringify(plugin_list))
    plugin_list.forEach( (plugin) => {
        matching_share_plugins = available_share_plugins.filter(spl => {
            return path.basename(spl) == plugin || path.basename(spl,".js") == plugin;
        });
        matching_camera_plugins =  available_camera_plugins.filter(cpl => {
            return path.basename(cpl) == plugin || path.basename(cpl,".js") == plugin;
        });
    });
    plugins.load_plugins_in_folder(matching_share_plugins, path.join(__dirname,"share"), (err) =>{
        if(err) { return callback(err)};
        return plugins.load_plugins_in_folder(matching_camera_plugins, path.join(__dirname,"camera"), callback);
    })
    return callback();
}

plugins.load_plugins_in_folder = async(plugin_list, folder, callback) => {
    plugin_list.forEach( (file) => { 
        try{
            var plugin = require(path.join(folder, file));
            if(plugin){
                global.logger.info(folder + " plugin: " + file + " loaded")
                plugins.share.push(plugin);
            }
            else{
                return callback(new Error("plugin not found: " + file))
            }
        }catch(e){
            return callback(new Error("plugin not found: " + file + e) )
        }
    });
    return callback();
}

module.exports = plugins;