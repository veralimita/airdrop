const async = require('async'),
	quit = Symbol('quit');

class Telegram {
	constructor (app, cb) {
		this.app = app;
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
			cb(err);
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	createUser (user, code, cb) {
		let normalizedUser
		try {
			normalizedUser = JSON.stringify(user)
		} catch(e) {
			normalizedUser = e.message
		}
		async.waterfall([
			(cb) => {
				this.client.set(`telegram:${user.id}`, code, 'NX', cb)
			},
			(_, cb) => {
				this.app.wallet.updateWallet(code, 'telegram', normalizedUser, cb)
			},
		], cb);
	}

	getUser (userId, cb) {
		this.client.get(`telegram:${userId}`, cb);
	}

}

module.exports = function () {
	return new Promise((resolve, reject)=>{
		this.telegram = new Telegram(this, (err)=>{
			if (err){
				return reject(err);
			}
			resolve();
		});
		this.on('quit', () => {
			this.telegram[quit];
		});
	});
};
