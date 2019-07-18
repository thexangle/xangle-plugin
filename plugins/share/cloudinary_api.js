var cloudinaryModule = {}
module.exports = cloudinaryModule;
var cloudConfig = require("../../config/config.json").cloudinary;
var cloudinary = require('cloudinary').v2

if(!cloudConfig || !cloudConfig.cloud_name || !cloudConfig.api_key || !cloudConfig.api_secret ){
    console.log("cloudinary config missing. Cannot load plugin");
    return;
}

cloudinary.config(cloudConfig);

cloudinaryModule.share = function(request){
    console.log("Received cloudinary share request: ", request.timestamp);
    if(request.timestamp && request.published_content && request.published_content.original_files){
        request.published_content.original_files.forEach((entry) => {
            if(entry.url && request.root_path) {
                console.log("uploading: ", entry.url);
                cloudinary.uploader.upload(request.root_path + entry.url, {folder: request.timestamp}, (err, response) => {
                    console.log("cloudinary response: ", err ? "ERROR:" + JSON.stringify(err, null, 4) : JSON.stringify(response, null, 4));
                })
            }
        });
    }
}
