# xangle-plugin
Plugins framework for Xangle Camera Server (XCS)


## What is it ? 
Xangle Camera Server is a software used to control large sets of cameras for bullet-time capture, photogrammetry scanners, and other multi-camera rigs. 

## Where can I find more information about Xangle?

Visit the Xangle software web site:  https://xanglecs.com/

## What can I use plugins for ? 
Plugins are meant to extend Xangle core functionalities and give you access to many features included in XangleCS through an API wrapped in simple nodeJS modules. Plugins can typically: 

 - Control cameras and send settings
 - Run custom scripts / trigger sequence
 - Extend your sharing options and integrate to 3rd party content delivery methods
 - Be notified when Xangle trigger cameras

## How do I run plugins?
Clone this repository

 1. Clone this repository
 2. Install nodejs from https://nodejs.org (when asked, add node to the PATH and also install npm)
 3. navigate to the local folder and type: ``npm install``
 4. Edit the ``config/config.json`` to add the plugin(s) you want to use in the ``plugins_to_run`` list
 5. start XangleCS and then run your plugins using `node index.js` command


## How do I write a new plugin?

Easy, simply create a new javascript file in either ``plugins/camera ``  or`` plugins/share`` folder. You can simply start by copying an existing plugin and rename it. That .js file will automatically be loaded and run by Xangle-Plugin framework. You will have access to all the Xangle API functionalities and callback from there. 
Please refer to the existing plugins for reference. 

