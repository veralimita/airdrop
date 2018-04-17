const assert = require("assert"),
	async = require('async'),
	quit = Symbol('quit');

class Google {
	constructor (app) {
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	//
	create (user, cb) {
		this.client.set(`google:${user.id}`, 'CREATED', 'NX', (err) => {
			cb(err, 'CREATED')
		})
	}

	update (id, code, cb) {
		console.log(id, code)
		this.client.set(`google:${id}`, code, (err, res) => {
			console.log('UPDATE', err, res)
			cb(err, res)
		})
	}

	get (id, cb) {
		this.client.get(`google:${id}`, cb);
	}

	delete (id, cb) {
		this.client.del(`google:${id}`, cb);
	}
}

module.exports = function () {

	this.google = new Google(this);

	this.on('quit', () => {
		this.google[quit];
	});

	return Promise.resolve();
}
