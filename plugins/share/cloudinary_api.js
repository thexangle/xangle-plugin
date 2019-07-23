var cloudinaryModule = {}
module.exports = cloudinaryModule;
var Config = require("../../config/config.json");
var server_url = Config.socket_io_server_url ? Config.socket_io_server_url : "http://localhost:8091"
var cloudConfig = Config.cloudinary;
var cloudinary = require('cloudinary').v2
var request = require('request');
var async = require('async');

if(!cloudConfig || !cloudConfig.cloud_name || !cloudConfig.api_key || !cloudConfig.api_secret ){
    console.log("cloudinary config missing. Cannot load plugin");
    return;
}

cloudinary.config(cloudConfig);
// This function is meant to keep Xangle informed of the progress, using POST to share_progress URL
// If file_id is not null, we update progress for a specific file, otherwise the message update the whole entry
// associated with a specific timestamp. 
cloudinaryModule.update = function(timestamp, file_id, info, callback){
    request.post(server_url + "/api/share_progress", {
        json: {
          timestamp: timestamp, 
          file_id: file_id,
          info: info
        }
      }, (error, res, body) => {
        if (error) {
          console.error(error)
        }
        return callback ? callback() : null;
      })
}

cloudinaryModule.share = function(request){
    console.log("Received cloudinary share request: ", request.timestamp);
    //create a list of tasks to run in parallel using async module
    var parallel_tasks = [];
    if(request.timestamp && request.published_content && request.published_content.original_files){
        request.published_content.original_files.forEach((entry) => {
            if(entry.url && request.root_path) {
                parallel_tasks.push( (callback) => {
                    console.log("uploading: ", entry.url);
                    // First notify Xangle that we are starting to upload a file. 
                    cloudinaryModule.update(request.timestamp, entry.url, {status: "uploading"}), () => {
                        // Upon receiving response from Xangle, proceed to upload on cloudinary
                        cloudinary.uploader.upload(request.root_path + entry.url, {folder: request.timestamp}, (err, response) => {
                            console.log("cloudinary response: ", err ? "ERROR:" + JSON.stringify(err, null, 4) : JSON.stringify(response, null, 4));
                            // Update upload status on server with the info returned by cloudinary
                            let update_info =  {status: err ? "failed" : "uploaded", camera_index: entry.camera_index, result: response};
                            cloudinaryModule.update(request.timestamp, entry.url, update_info, () => {
                                return callback(null, err ? err: null)
                            });
                        });
                    }
                });
            }
        });
    }

    // Now run these tasks ! 
    async.parallel(parallel_tasks, (err, results) =>{
        //If [results] array has some values then it means some tasks failed. 
        var success = !err && results.length == 0;
        // And notify the server when all the tasks are finished
        cloudinaryModule.update(request.timestamp, null, {status: success ? "uploaded" : "failed"});
    })
}
