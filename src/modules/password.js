const async = require('async');

class Password {
	constructor (app, cb) {
		this.app = app;
		this.length = 6;
		this.dictionary = '0123456789';
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
			cb(err);
		});
	}

	getPassword (password, cb) {
		this.client.get(`password:${password}`, cb);
	}

	deletePassword (password, cb) {
		this.client.del(`password:${password}`, cb);
	}

	create (code, cb) {
		const password = this.generate();
		this.client.get(`password:${password}`, (err, resp) => {
			if (resp) {
				return this.invite(code, cb)
			}
			this.client.set(`password:${password}`, code, 'EX', 60 * 5, (err, resp) => {
				cb(err, password)
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
		return letter;
	}
}

module.exports = function () {
	return new Promise((resolve, reject)=>{
		this.password = new Password(this, (err)=>{
			if (err){
				return reject(err);
			}
			resolve();
		});
	});
}
