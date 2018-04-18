const async = require('async');

class Refer {
	constructor (app) {
		this.app = app;
		this.length = 12;
		this.dictionary = 'QAZWSXEDCRFTGBYHNJMKLP23456789';
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
	}

	get (referral, cb) {
		this.client.get(`refer:${referral}`, cb)
	}

	canUse (referral, cb) {
		this.client.llen(`activated:${referral}`, (err, count) => {
			if (err || count >= 5) {
				return cb(err || 'number of use is more than 5')
			}
			cb(null)
		})
	}

	use (referral, wallet, cb) {
		async.parallel([
			(cb) => {
				this.client.lpush(`activated:${referral}`, wallet.code, cb)
			},
			(cb) => {
				this.app.wallet.updateWallet(wallet.code, 'referral', referral, cb);
			}
		], cb);
	}

	invite (code, cb) {
		const refer = this.generate();
		this.client.get(`refer:${refer}`, (err, resp) => {
			if (resp) {
				return this.invite(code, cb)
			}
			this.client.set(`refer:${refer}`, code, (err) => {
				cb(err, refer)
			})
		})
	}

	generate () {
		let id = this.getLetter();
		for (let i = 1; i < this.length; i++) {
			id = id + this.getLetter(id.substr(-1, 1))
		}
		return id
	}

	getLetter (prev) {
		let letter = this.dictionary[Math.floor(Math.random() * this.dictionary.length)];
		if (letter != prev) return letter;
		return this.getLetter(prev)
	}
}

module.exports = function () {

	this.on("ready", () => {

	});

	this.refer = new Refer(this);

	return Promise.resolve();
}
