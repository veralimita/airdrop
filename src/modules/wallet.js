const async = require('async'),
	quit = Symbol('quit'),
	__app = Symbol('quit');

class Wallet {
	constructor(app, cb) {
		this[__app] = app;
		this[__app].redis.createClient('wallet', (err, client) => {
			this.client = client;
			cb(err);
		});
	}

	[quit]() {
		this.client && this.client.quit();
	}

	appendWalletToSocial(source, plugin, wallet, user, code, cb) {
		if (wallet[source]) {
			return setImmediate(cb, `This wallet has a ${source} account`);
		}
		async.parallel([
			(cb) => {
				plugin.update(user[source], code, cb)
			},
			(cb) => {
				this.updateWallet(code, source, JSON.stringify({id: user[source]}), cb)
			}
		], (error) => {
			if (error) {
				async.parallel([
					(cb) => {
						plugin.update(user[source], 'CREATED', cb)
					},
					(cb) => {
						this.updateWallet(code, source, {id: user[source]}, cb)
					}
				], (error) => {
					console.log('ROLLBACK APPEND WALLET TO ' + source, error ? 'failed' : 'passed')
					cb(error || 'Update failed')
				})
			} else {
				this.getWallet(code, (err, wallet) => {
					cb(error, {source, wallet})
				})
			}
		})
	}

	updateWallet(code, field, value, cb) {
		if (value) {
			this.client.hmset(code, field, value, cb)
		}
		else {
			this.client.hdel(code, field, cb)
		}
	}

	getWallet(code, cb) {
		async.waterfall([
			(cb) => {
				this.client.hgetall(code, (err, resp) => {
					if (err || !resp) {
						return cb(err || "Walet doesn't exists");
					}
					cb(null, resp);
				});
			},
			(wallet, cb) => {
				this[__app].refer.getUsed(wallet.refer, (err, len) => {
					if (err) {
						return cb(err)
					}
					wallet.activated = len;
					cb(null, wallet)
				})
			}
		], (err, resp) => {
			if (err || !resp) {
				return cb(err || "Walet doesn't exist");
			}
			cb(err, resp);
		});
	}

	createWallet(code, cb) {
		async.waterfall([
			(cb) => {
				this.client.hmset(code, 'code', code, (err, result) => {
					cb(err, result);
				});
			},
			(wallet, cb) => {
				this[__app].refer.invite(code, (err, resp) => {
					this.updateWallet(code, 'refer', resp, (err) => {
						cb(err, code)
					})
				});
			}
		], (err) => {
			cb(err, code);
		});
	}
}

module.exports = function () {
	return new Promise((resolve, reject) => {
		this.wallet = new Wallet(this, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
		this.on('quit', () => {
			this.wallet[quit];
		});
	});
};
