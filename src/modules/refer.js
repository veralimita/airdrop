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
