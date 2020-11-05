const EventEmitter = require('events');
const udp = require('dgram');
var udpReceiver = new EventEmitter();

// --------------------creating a udp server --------------------

// creating a udp server
const udpserver = udp.createSocket({ type: 'udp4', reuseAddr: true});

// emits when any error occurs
udpserver.on('error',function(error){
  global.logger.error('[UDP]: ' + error);
  udpserver.close();
});

// emits on new datagram msg
udpserver.on('message', function(msg,info){
    try{
        const message = JSON.parse(msg.toString());
        if(message.commands){
            udpReceiver.emit("commands", message);
        }
        else if(message.command){
            udpReceiver.emit("command", message);
        }
    }catch(e){}
});


//emits when socket is ready and listening for datagram msgs
udpserver.on('listening',function(){
  var address = udpserver.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  global.logger.info('[UDP] Server is listening at port' + port);
  global.logger.info('[UDP] Server ip :' + ipaddr);
  global.logger.info('[UDP] Server is IP4/IP6 : ' + family);
  udpReceiver.emit("listening", address)
});

//emits after the socket is closed using socket.close();
udpserver.on('close',function(){
    global.logger.info('[UDP] Socket is closed !');
});

udpserver.bind(9180);

module.exports = udpReceiver;