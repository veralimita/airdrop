const async = require('async'),
	quit = Symbol('quit');

class Rocketchat {
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
				this.client.set(`rocketchat:${user.id}`, code, 'NX', cb)
			},
			(_, cb) => {
				this.app.wallet.updateWallet(code, 'rocketchat', normalizedUser, cb)
			},
		], cb);
	}

	getUser (user, cb) {
		this.client.get(`rocketchat:${user.id}`, cb);
	}

}

module.exports = function () {
	return new Promise((resolve, reject)=>{
		this.rocketchat = new Rocketchat(this, (err)=>{
			if (err){
				return reject(err);
			}
			resolve();
		});
		this.on('quit', () => {
			this.rocketchat[quit];
		});
	});
};
