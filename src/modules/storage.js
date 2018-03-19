const async = require('async'),
	__createWallet = Symbol('createWallet');

class Storage {
	constructor (app) {
		this.app = app;
	}

	getRandomCode (cb) {
		async.waterfall(
			[
				(cb) => {
					this.app["redis"].send_command('RANDOMKEY', cb);
				},
				(key, cb) => {
					this.app["redis"].del(key, (err) => {
						cb(err, key)
					});
				},
				(key, cb) => {
					this[__createWallet](key, cb);
				}
			],
			(err, result) => {
				cb && cb(err, result)
			})
	}

	[__createWallet] (code, cb){
		async.tryEach([
				(cb) => {
					this.app["redis"].hmset(["wallet", code, 1], (err, result) => {
						cb(err, code);
					});
				},
				(cb) => {
					this.app["redis"].set(code, 1, (err, result) => {
						cb(err || new Error('Cant create wallet'), code);
					});
				}
			],
			cb);

	}
}

module.exports = function () {

	this.storage = new Storage(this);

	return Promise.resolve();
};
