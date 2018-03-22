const async = require('async'),
	quit = Symbol('quit');

class Wallet {
	constructor (redis) {
		redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	updateWallet (code, field, value, cb) {
		async.waterfall([
			(cb) => {
				this.getWallet(code, cb)
			},
			(wallet, cb) => {
				wallet[field] = value;
				this.client.set(code, JSON.stringify(wallet), cb)
			},
		], cb);
	}

	getWallet (code, cb) {
		this.client.get(code, (err, resp) => {
			if (err || !resp) {
				return cb(err || "Walet doesn't exists");
			}

			let wallet, error;
			try {
				wallet = JSON.parse(resp);
			} catch (e) {
				error = e;
			}

			cb(error, wallet);
		});
	}

	createWallet (code, cb) {
		this.client.set(code, JSON.stringify({code}), (err, result) => {
			cb(err, code);
		});
	}
}

module.exports = function () {

	this.wallet = new Wallet(this.redis);
	this.on('quit', () => {
		console.log('QUIT FROM WALLET');
		this.wallet[quit];
	});

	return Promise.resolve();
};
