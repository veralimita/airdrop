const async = require('async'),
	quit = Symbol('quit');

class Rocketchat {
	constructor (app, cb) {
		this.app = app;
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	createUser (user, code, cb) {
		async.waterfall([(cb) => {
			this.getUser(user, (err, result) => {
				if (err || result) {
					return cb(err || 'Rocketchat user already exists')
				}
				cb(null, code)
			})
		},
			(arg, cb) => {
				this.client.set(`rocketchat:${user.id}`, code, cb)
			},
			(arg, cb) => {
				this.app.wallet.updateWallet(code, 'rocketchat', user.id, cb)
			},
		], cb);
	}

	getUser (user, cb) {
		this.client.get(`rocketchat:${user.id}`, cb);
	}

}

module.exports = function () {
	this.rocketchat = new Rocketchat(this);

	this.on('quit', () => {
		this.rocketchat[quit];
	});


	return Promise.resolve();
};
