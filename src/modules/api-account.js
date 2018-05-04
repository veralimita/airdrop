const express = require('express'),
	async = require('async'),
	jwt = require('express-jwt'),
	OK = 'OK';

function multiVerify(req, res, next) {
	let source = req.query.source || req.body.source;
	let user = req.query.payload || req.body.payload;

	if (source && user) {
		this[source].getUser(user.id, (error, result) => {
			if (error || !result) {
				return next(error || `${source} user doesn't exist`)
			}
			next({
				...user,
				wallet: result
			})
		});
	} else {
		jwt({secret: process.env.JWT_SECRET})(req, res, next)
	}
}

module.exports = function () {
	const router = express.Router();

	// protected by token apis
	router.get('/wallet', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (!req.user || !req.user.wallet) {
			return res.status(500).send({error: 'Wallet doesnt exist', user: req.user})
		}

		if (req.user.wallet === 'CREATED') {
			if (req.user.google) {
				this.google.get(req.user.google, (err, code) => {
					this.wallet.getWallet(code, (err, resp) => {
						const token = this.jwt.create({
							wallet: (resp && resp.code) || 'CREATED',
							google: req.user.google
						})
						return res.send({response: resp || {code: 'CREATED'}, token})
					})
				})
			} else if (req.user.twitter) {
				this.twitter.get(req.user.twitter, (err, code) => {
					this.wallet.getWallet(code, (err, resp) => {
						const token = this.jwt.create({
							wallet: (resp && resp.code) || 'CREATED',
							twitter: req.user.twitter
						})
						return res.send({response: resp || {code: 'CREATED'}, token})
					})
				})
			} else if (req.user.facebook) {
				this.fb.get(req.user.facebook, (err, code) => {
					this.wallet.getWallet(code, (err, resp) => {
						const token = this.jwt.create({
							wallet: (resp && resp.code) || 'CREATED',
							facebook: req.user.facebook
						})
						return res.send({response: resp || {code: 'CREATED'}, token})
					})
				})
			} else {
				const token = this.jwt.create({
					wallet: req.user.wallet,
					facebook: req.user.facebook,
					twitter: req.user.twitter,
					google: req.user.google
				})
				return res.send({response: {code: null}, token})
			}
		} else {
			const token = this.jwt.create({
				wallet: req.user.wallet,
				facebook: req.user.facebook,
				twitter: req.user.twitter,
				google: req.user.google
			})
			this.wallet.getWallet(req.user.wallet, (error, response) => {
				if (error) {
					return res.status(500).send({error, token})
				}
				return res.send({response, token});
			})
		}
	});

	router.post('/token', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (!req.user || !req.user.wallet) {
			return res.status(500).send({error: 'Wallet doesnt exist', user: req.user})
		}
		if (req.user.wallet !== 'CREATED') {
			return res.status(500).send({error: 'Wallet token exists'})
		}
		const code = req.body && req.body.code.toUpperCase();
		async.waterfall([
				(cb) => {
					this.wallet.getWallet(code, cb)
				},
				(wallet, cb) => {
					if (req.user.google) {
						this.wallet.appendWalletToSocial('google', this.google, wallet, req.user, code, cb)
					}
					else if (req.user.twitter) {
						this.wallet.appendWalletToSocial('twitter', this.twitter, wallet, req.user, code, cb)
					}
					else if (req.user.facebook) {
						this.wallet.appendWalletToSocial('facebook', this.fb, wallet, req.user, code, cb)
					}
					else {
						setImmediate(cb, 'Unhandled social connect')
					}
				}
			],
			(error, response) => {
				if (error) {
					return res.status(500).send({error});
				}
				// normal response
				const token = this.jwt.create({
					wallet: response.wallet.code
				})
				return res.send({response: response.wallet, token})
			}
		)
	});

	router.post('/email', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (!req.user || !req.user.wallet || !req.body || !req.body.value) {
			return res.sendStatus(500)
		}

		const email = req.body.value.toLowerCase();
		let code = req.user.wallet;
		async.waterfall([
			(cb) => {
				this.email.get(email, (error, resp) => {
					if (error || resp) {
						return cb(error || 'Email is already taken')
					}
					cb(null)
				});
			},
			(cb) => {
				this.wallet.getWallet(code, (error, resp) => {
					if (error || !resp) {
						return cb(error || 'Wallet doesn\'t exist');
					}
					if (resp.email) {
						return cb('Wallet has email');
					}
					cb(null)
				})
			},
			(cb) => {
				this.email.create(email, code, cb);
			},
			(_, cb) => {
				this.email.sendLink({value: email}, code, cb);
			},
		], (error) => {
			if (error) {
				return res.status(500).send({error})
			}
			this.wallet.getWallet(code, (error, response) => {
				const token = this.jwt.create({wallet: response && response.code})
				return res.send({error, response, token})
			});
		});
	});

	router.get('/resend', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (!req.user || !req.user.wallet) {
			res.sendStatus(500)
		}

		const code = req.user.wallet;
		async.waterfall([
			(cb) => {
				this.wallet.getWallet(code, (error, resp) => {
					if (error || !resp) {
						return cb(error || 'Wallet doesn\'t exist');
					}
					if (!resp.email) {
						return cb('Wallet doesn\'t have email');
					}
					const dbEmail = this.email.deserialize(resp.email)
					cb(null, dbEmail)
				})
			},
			(email, cb) => {
				this.email.sendLink(email, code, cb);
			}
		], (error) => {
			if (error) {
				res.status(500);
				return res.send({error})
			}
			res.send({token: this.jwt.create({wallet: code}), response: OK});
		});
	});

	router.get('/validate', (req, res) => {
		if (!req.query || !req.query.token) {
			return res.redirect(`http://localhost:8000/error?text=${Buffer.from("Token is broken").toString('base64')}`)
		}

		this.jwt.verify(req.query.token, (error, decoded) => {
			if (error) {
				return res.redirect(`http://localhost:8000/error?text=${Buffer.from(error).toString('base64')}`)
			}
			if (!decoded.code || !decoded.email) {
				return res.redirect(`http://localhost:8000/error?text=${Buffer.from("Token is broken").toString('base64')}`)
			}
			const email = decoded.email.value;
			const code = decoded.code;
			async.waterfall([
				(cb) => {
					this.email.get(email, (error, wallet) => {
						if (error) {
							return cb(error);
						}
						if (code !== wallet) {
							res.status(500);
							return cb('Wrong token');
						}
						return cb(null, wallet);
					});
				},
				(wallet, cb) => {
					this.wallet.getWallet(wallet, (error, response) => {
						if (error) {
							return cb(error);
						}
						const dbEmail = this.email.deserialize(response.email)
						if (dbEmail.value != email) {
							return cb('Wrong token');
						}
						if (dbEmail.verified) {
							return cb('Email is already verified');
						}
						return cb(null, wallet);
					});
				},
				(wallet, cb) => {
					this.wallet.updateWallet(wallet, 'email', JSON.stringify({value: email, verified: true}), cb);
				}
			], (error) => {
				if (error) {
					return res.redirect(`http://localhost:8000/error?text=${Buffer.from(error).toString('base64')}`)
				}
				this.wallet.getWallet(code, (error, response) => {
					if (error) {
						return res.redirect(`http://localhost:8000/error?text=${Buffer.from(error).toString('base64')}`)
					}
					res.redirect(`http://localhost:8000/success`)
				});
			});
		})
	});

	router.post('/referral', multiVerify, (req, res) => {
		async.autoInject({
			wallet: (cb) => {
				this.wallet.getWallet(req.user.wallet, cb)
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
			},
			newWallet: (apply, cb) => {
				this.wallet.getWallet(req.user.wallet, cb)
			},
			referWallet: (referral, cb) => {
				this.wallet.getWallet(referral, cb)
			},
			notification: (newWallet, referWallet, cb) => {
				let referWalletObj = {};
				try {
					referWalletObj = JSON.parse(referWallet.telegram || referWallet.rocketchat);
				} catch (e) {
					return cb(e)
				}
				this.rabbitConnect.send({
					chatId: referWalletObj.room,
					amount: 50,
					client: referWallet.telegram ? "telegram" : "rocket"
				}, `${referWallet.telegram ? "telegram" : "rocket"}.notification, cb);
			}
		}, (error, scope) => {
			if (error) {
				res.status(500).send({error})
			}
			else {
				res.send({response: scope.newWallet});
			}
		});
	});

	this.express.use('/account', router);

	return Promise.resolve();
};
