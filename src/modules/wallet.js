const async = require('async'),
	quit = Symbol('quit'),
	__app = Symbol('quit');

class Wallet {
	constructor (app) {
		this[__app] = app;
		this[__app].redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	appendWalletToSocial (source, plugin, wallet, user, code, cb) {
		if (wallet[source]) return setImmediate(cb, `This wallet has a ${source} account`);
		async.parallel([
			(cb) => {
				plugin.update(user[source], code, cb)
			},
			(cb) => {
				this.updateWallet(code, source, { id: user[source] }, cb)
			}
		], (error, results) => {
			if (error) {
				async.parallel([
					(cb) => {
						plugin.update(user[source], 'CREATED', cb)
					},
					(cb) => {
						this.updateWallet(code, source, { id: user[source] }, cb)
					}
				], (error) => {
					console.log('ROLLBACK APPEND WALLET TO ' + source, error ? 'failed' : 'passed')
					cb(error || 'Update failed')
				})
			} else {
				this.getWallet(code, (err, wallet) => {
					cb(error, { source, wallet })
				})
			}
		})
	}

	updateWallet (code, field, value, cb) {
		async.waterfall([
			(cb) => {
				this.getWallet(code, cb)
			},
			(wallet, cb) => {
				if (value) {
					wallet[field] = value;
				}
				else {
					delete wallet[field];
				}
				console.log('WALLET', code, field, value, wallet)
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
		async.waterfall([
			(cb) => {
				this.client.set(code, JSON.stringify({ code }), (err, result) => {
					cb(err, result);
				});
			},
			(wallet, cb) => {
				this[__app].refer.invite(code, (err, resp) => {
					this.updateWallet(code, 'refer', { code: resp, activated: [] }, (err, resp) => {
						cb(null, code)
					})
				});
			}
		], (err, resp) => {
			cb(err, code);
		});
	}
}

module.exports = function () {

	this.wallet = new Wallet(this);
	this.on('quit', () => {
		console.log('QUIT FROM WALLET');
		this.wallet[quit];
	});

	return Promise.resolve();
};
