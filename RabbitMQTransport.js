var amqp = require('amqplib/callback_api');
var Transport = require('winston-transport');

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

          resolve(ch);

        });

      });

    });

  }

  log(info, message) {

    var pLogger = this.pLogger;
    var queue = this.queue;
    var origin = this.origin;

    setImmediate(function () {
      pLogger.then(function(channel){

        var log = JSON.stringify({
          level: info,
          log: message,
          "origin": origin
        });

        channel.sendToQueue(queue, new Buffer(log));

      },function(err){
        console.log("logger error", err);
      });
    });



  }
};
