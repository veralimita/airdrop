const redis = require("redis"),
	client = redis.createClient();

module.exports = function () {

	this.on("ready", () => {

	})

	client.on('error', console.error);

	this.redis = client;

	client.on('ready', () => {
		// TODO somthing to carch ready state
	})

	return Promise.resolve();
}
