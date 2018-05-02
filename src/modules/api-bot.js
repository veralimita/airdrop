const express = require('express'),
	async = require('async'),
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	router.post('/code', (req, res) => {
		if (!req.body || !req.body.source || ['rocketchat', 'telegram'].indexOf(req.body.source) === -1) {
			return res.sendStatus(500);
		}

		async.waterfall([
			(cb) => {
				this[req.body.source].getUser(req.body.payload.id, (error, result) => {
					if (error || result) {
						return cb(error || `${req.body.source} exists`)
					}
					cb(null)
				});
			},
			(cb) => {
				this.storage.getRandomCode(cb);
			},
			(code, cb) => {
				this[req.body.source].createUser(req.body.payload, code, (error) => {
					cb(error, code)
				})
			}
		], (error, response) => {
			res.send({error, response});
		});
	});

	router.post('/wallet', (req, res) => {
		if (!req.body || !req.body.source || ['rocketchat', 'telegram'].indexOf(req.body.source) === -1) {
			return res.sendStatus(500);
		}

		async.waterfall([
			(cb) => {
				this[req.body.source].getUser(req.body.payload.id, (error, result) => {
					if (error || !result) {
						return cb(error || `${req.body.source} user doesn't exist`)
					}
					cb(null, result)
				});
			},
			(code, cb) => {
				this.wallet.getWallet(code, (error, response) => {
					cb(error, response)
				})
			}
		], (error, response) => {
			res.send({error, response});
		});
	});

	router.post('/referral', (req, res) => {
		if (!req.body || !req.body.source || !req.body.referral || ['rocketchat', 'telegram'].indexOf(req.body.source) === -1) {
			return res.sendStatus(500);
		}

		async.autoInject({
			code: (cb) => {
				this[req.body.source].getUser(req.body.payload.id, (error, result) => {
					if (error || !result) {
						return cb(error || `${req.body.source} user doesn't exist`)
					}
					cb(null, result)
				});
			},
			wallet: (code, cb) => {
				this.wallet.getWallet(code, (error, response) => {
					cb(error, response)
				})
			},
			referral: (wallet, cb) => {
				if (wallet.refer === req.body.referral) {
					return setImmediate(cb, 'Referral emitted by this account')
				}
				if (!!wallet.referral) {
					return setImmediate(cb, 'Referral was register for this wallet')
				}
				this.refer.get(req.body.referral, (err, response) => {
					if (err || !response) {
						return cb(err || 'Wrong referral code')
					}
					cb(null, response)
				})
			},
			checkReferral: (referral, wallet, cb) => {
				this.refer.canUse(req.body.referral, (err) => {
					if (err) {
						return cb(err)
					}
					cb(null, true)
				})
			},
			apply: (checkReferral, wallet, cb) => {
				this.refer.use(req.body.referral, wallet, cb)
			}
		}, (error, scope) => {
			if (error) {
				res.status(500).send(error)
			}
			else {
				res.send({response: OK});
			}
		});
	});

	this.express.use('/bot', router);

	return Promise.resolve();
};
