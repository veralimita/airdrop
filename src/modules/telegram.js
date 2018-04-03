const async = require('async'),
	quit = Symbol('quit');

class Telegram {
	constructor (app) {
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
					return cb(err || 'Telegram user already exists')
				}
				cb(null, code)
			})
		},
			(arg, cb) => {
				this.client.set(`telegram:${user.id}`, code, cb)
			},
			(arg, cb) => {
				this.app.wallet.updateWallet(code, 'telegram', user, cb)
			},
		], cb);
	}

	getUser (user, cb) {
		this.client.get(`telegram:${user.id}`, cb);
	}

}

module.exports = function () {
	this.telegram = new Telegram(this);

	this.on('quit', () => {
		this.telegram[quit];
	});


	return Promise.resolve();
};