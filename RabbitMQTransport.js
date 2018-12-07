var amqp = require('amqplib/callback_api');
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

      amqp.connect(opts.url, function(err, conn) {

        if(err){
          return reject(err);
        }

        conn.createChannel(function(err, ch) {

          if(err){
            return reject(err);
          }

          var q = opts.queue;

          ch.assertQueue(q, {durable: false});

          loggers.set(loggerPath, ch);

          return resolve(ch);

        });

      });

    });

  }

  log(info, callback) {

    var pLogger = this.pLogger;
    var queue = this.queue;
    var origin = this.origin;

    setImmediate(function () {
      pLogger.then(function(channel){

        info.origin = origin;

        let strInfo = JSON.stringify(info)

        channel.sendToQueue(queue, new Buffer(strInfo));

        callback();

      },function(err){
        console.log("logger error", err);
      });
    });



  }
};
