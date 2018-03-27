const assert = require("assert"),
	Rabbitmq = require('../rabbitmq-boilerplate/index.js');

module.exports = function () {

	assert(!this.rabbitConnect, "field exists");
	this.rabbitConnect = new Rabbitmq();
	this.rabbitConnect.on("error", console.error);
	this.rabbitConnect.config('amqp://rabbitmq:rabbitmq@rabbitmq.utopia.airdrop.com:5672');

	return Promise.resolve();
}