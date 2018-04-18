const async = require('async'),
	__createWallet = Symbol('createWallet'),
	quit = Symbol('quit');

class Storage {
	constructor(app, cb) {
		this.app = app;
		app.redis.createClient('codes', (err, client) => {
			this.client = client;
			cb(err);
		});
	}

	[quit]() {
		this.client && this.client.quit();
	}

	getRandomCode(cb) {
		async.waterfall([
				(cb) => {
					this.client.send_command('RANDOMKEY', (err, resp) => {
						if (err || !resp) {
							return cb(err || 'empty key')
						}
						cb(null, resp)
					});
				},
				(key, cb) => {
					this.client.del(key, (err) => {
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

	[__createWallet](code, cb) {
		async.tryEach([
				(cb) => {
					this.app.wallet.createWallet(code, cb);
				},
				(cb) => {
					this.client.set(code, JSON.stringify({code}), (err, result) => {
						cb(err || new Error('Cant create wallet'), code);
					});
				}
			],
			cb);

	}
}

module.exports = function () {
	return new Promise((resolve, reject)=>{
		this.storage = new Storage(this, (err)=>{
			if (err){
				return reject(err);
			}
			resolve();
		});
		this.on('quit', () => {
			this.storage[quit];
		});
	});
};
