var amqp = require('amqp-connection-manager');
var Transport = require('winston-transport');
var loggers = new Map();

module.exports = class RabbitMQTransport extends Transport {

  constructor(opts) {
    super(opts);

    if(!opts.url){
      throw new Error("url is required");
    }

    if(!opts.queue){
      throw new Error("queue is required");
    }

    this.queue = opts.queue;
    this.origin = opts.origin;
    this.pLogger = new Promise(function(resolve, reject){

      var loggerPath = opts.url+opts.queue;

      if(loggers.has(loggerPath)){
        return resolve(loggers.get(loggerPath));
      }

      var connection = amqp.connect([opts.url]);

      var channelWrapper = connection.createChannel({
          json: true,
          setup: function(channel) {
              // `channel` here is a regular amqplib `ConfirmChannel`.
              // Note that `this` here is the channelWrapper instance.
              return channel.assertQueue(opts.queue, {durable: false})
          }
      });

      loggers.set(loggerPath, channelWrapper);

      resolve(loggers.get(loggerPath));

    });

  }

  log(info, callback) {

    var pLogger = this.pLogger;
    var queue = this.queue;
    var origin = this.origin;

    setImmediate(function () {
      pLogger.then(function(channel){

        info.origin = origin;

      channel.sendToQueue(queue, info)
      .then(function() {
          return console.log("message sent");
      }).catch(function(err) {
          return console.error(err);
      });

        callback();

      },function(err){
        console.error(err);
      });
    });



  }
};
