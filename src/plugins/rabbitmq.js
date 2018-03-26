const assert = require("assert"),
	Rabbitmq = require('rabbitmq-boilerplate');

module.exports = function () {

	assert(!this.rabbitConnect, "field exists");
	this.rabbitConnect = new Rabbitmq();
	this.rabbitConnect.on("error", console.error);
	this.rabbitConnect.config('amqp://rabbitmq.utopia.airdrop.com');

	return Promise.resolve();
}