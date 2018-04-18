const express = require('express'),
	async = require('async'),
	jwt = require('express-jwt'),
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	// protected by token apis
	router.get('/wallet', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (req.user && req.user.wallet) {
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
		} else {
			res.status(500).send({error: 'Wallet doesnt exist', user: req.user})
		}
	});

	router.post('/token', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (req.user && req.user.wallet) {
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
						wallet: response.wallet
					})
					return res.send({response: response.wallet, token})
				}
			)
		} else {
			res.status(500).send({error: 'Wallet doesnt exist', user: req.user})
		}
	});

	router.post('/email', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (req.user && req.user.wallet && req.body && req.body.value) {
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
					// TODO email worker
					this.email.sendLink({value: email}, code, (error, resp) => {
						console.log('sended link', {error, resp})
					});
					return setImmediate(cb)
				},
			], (error) => {
				if (error) {
					return res.status(500).res.send({error})
				}
				this.wallet.getWallet(code, (error, response) => {
					console.log({error, response})
					const token = this.jwt.create({wallet: response && response.code})
					return res.send({error, response, token})
				});
			});
		} else {
			res.sendStatus(500)
		}
	});

	router.get('/resend', jwt({secret: process.env.JWT_SECRET}), (req, res) => {
		if (req.user && req.user.wallet) {
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
						cb(null, resp.email)
					})
				},
				(email, cb) => {
					this.email.sendLink(email, code, (err) => {
						if (err) console.error(err)
					});
					setImmediate(cb);
				}
			], (error, _) => {
				if (error) {
					res.status(500);
					return res.send({error})
				}
				res.send({token: this.jwt.create({wallet: code}), response: OK});
			});
		} else {
			res.sendStatus(500)
		}
	});

	router.get('/validate', (req, res) => {
		if (req.query && req.query.token) {
			this.jwt.verify(req.query.token, (error, decoded) => {
				if (error) {
					res.status(500);
					return res.send({error});
				}
				if (!decoded.code || !decoded.email) {
					res.status(500);
					return res.send({error: 'Token is broken'})
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
							if (!response.email || (response.email.value != email)) {
								return cb('Wrong token');
							}
							if (response.email.verified) {
								return cb('Email is already verified');
							}
							return cb(null, wallet);
						});
					},
					(wallet, cb) => {
						this.wallet.updateWallet(wallet, 'email', {value: email, verified: true}, cb);
					}
				], (error) => {
					if (error) {
						res.status(500);
						return res.send({error});
					}
					this.wallet.getWallet(code, (error, response) => {
						return res.send({error, response});
					});
				});
			})
		} else {
			res.status(500);
			res.send({error: 'Token is required'})
		}
	});

	this.express.use('/account', router);

	return Promise.resolve();
};
