const express = require('express'),
	async = require('async'),
	jwt = require('express-jwt'),
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	router.post('/code', (req, res) => {
		console.log('TOKEN API')
		if (req.body && req.body.source) {
			switch (req.body.source) {
				case 'rocketchat':
					async.waterfall(
						[
							(cb) => {
								this.rocketchat.getUser(req.body.payload, (err, result) => {
									if (err || result) {
										return cb(err || 'Rocketchat user already exists')
									}
									cb(null, null)
								});
							},
							(arg, cb) => {
								this.storage.getRandomCode(cb);
							},
							(code, cb) => {
								this.rocketchat.createUser(req.body.payload, code, (err, response) => {
									cb(err, code)
								})
							}
						], (err, response) => {
							res.send({ err, response });
						});
					break;
				case 'telegram':
					async.waterfall(
						[
							(cb) => {
								this.telegram.getUser(req.body.payload, (err, result) => {
									if (err || result) {
										return cb(err || 'Telegram user already exists')
									}
									cb(null, null)
								});
							},
							(arg, cb) => {
								this.storage.getRandomCode(cb);
							},
							(code, cb) => {
								this.telegram.createUser(req.body.payload, code, (err, response) => {
									cb(err, code)
								})
							}
						], (err, response) => {
							res.send({ err, response });
						});
					break;
				default:
					res.sendStatus(500)
			}
		} else {
			res.sendStatus(500)
		}
	});

	router.post('/wallet', (req, res) => {
		if (req.body && req.body.source) {
			switch (req.body.source) {
				case 'rocketchat':
					async.waterfall(
						[
							(cb) => {
								this.rocketchat.getUser(req.body.payload, (err, result) => {
									if (err || !result) {
										return cb(err || 'Rocketchat user doesn\'t exist')
									}
									cb(null, result)
								});
							},
							(code, cb) => {
								this.wallet.getWallet(code, (err, response) => {
									cb(err, response)
								})
							}
						], (err, response) => {
							res.send({ err, response });
						});
					break;
				case 'telegram':
					async.waterfall(
						[
							(cb) => {
								this.telegram.getUser(req.body.payload, (err, result) => {
									if (err || !result) {
										return cb(err || 'Telegram user doesn\'t exist')
									}
									cb(null, result)
								});
							},
							(code, cb) => {
								this.wallet.getWallet(code, (err, response) => {
									cb(err, response)
								})
							}
						], (err, response) => {
							res.send({ err, response });
						});
					break;
				default:
					res.sendStatus(500)
			}
		} else {
			res.sendStatus(500)
		}
	});

	router.post('/password', (req, res) => {
		if (req.body && req.body.code) {
			const code = req.body.code;
			async.waterfall([
				(cb) => {
					this.wallet.getWallet(code, (err, resp) => {
						if (err || !resp) {
							return cb(err || 'Wallet doesn\'t exist');
						}
						cb(null, resp);
					})
				},
				(wallet, cb) => {
					if (!wallet.telegram && !wallet.rocketchat && (!wallet.email || !wallet.email.verified)) {
						return setImmediate(cb, 'Cant provide password to this wallet');
					}
					this.password.create(code, (err, pwd) => {
						cb(err, { wallet, pwd })
					});
				}
			], (err, result) => {
				if (err) {
					res.status(500);
					return res.send(err);
				}

				const sources = [];
				if (result.wallet.telegram) {
					this.rabbitConnect.send({ user: result.wallet.telegram, pwd: result.pwd }, {
						"queue": "pwd.telegram",
						"expiration": 60 * 1000
					});
					sources.push('telegram');
				}
				if (result.wallet.rocketchat) {
					this.rabbitConnect.send({ user: result.wallet.rocketchat, pwd: result.pwd }, {
						"queue": "pwd.rocketchat",
						"expiration": 60 * 1000
					});
					sources.push('rocketchat');
				}
				if (result.wallet.email && result.wallet.email.verified) {
					this.rabbitConnect.send({ user: result.wallet.email, pwd: result.pwd }, {
						"queue": "pwd.email",
						"expiration": 60 * 1000
					});
					sources.push('email');
				}
				res.send(sources);
			})
		} else {
			res.sendStatus(500);
		}
	});

	router.post('/login', (req, res) => {
		if (req.body && req.body.code && req.body.password) {
			const code = req.body.code;
			const pwd = req.body.password;
			async.waterfall([
				(cb) => {
					this.wallet.getWallet(code, (err, resp) => {
						if (err || !resp) {
							return cb(err || 'Wallet doesn\'t exist');
						}
						cb(null, resp);
					})
				},
				(wallet, cb) => {
					this.password.getPassword(pwd, (err, resp) => {
						if (err || !resp || (resp !== code)) {
							return cb(err || 'Password is incorrect');
						}
						cb(null, resp);
						this.password.deletePassword(pwd, () => {
							//TODO error handing
						})
					})
				}
			], (err) => {
				if (err) {
					res.status(500);
					return res.send(err);
				}
				res.send({ token: this.jwt.create({ wallet: code }) });
			})
		} else {
			res.sendStatus(500);
		}
	});

	router.get('/validate', (req, res) => {
		if (req.query && req.query.token) {
			this.jwt.verify(req.query.token, (err, decoded) => {
				if (err) {
					res.status(500);
					return res.send(err);
				}
				if (!decoded.code || !decoded.email) {
					res.status(500);
					return res.send({ err: 'Token is broken' })
				}
				const email = decoded.email.value;
				const code = decoded.code;

				async.waterfall([(cb) => {
					this.email.get(email, (err, wallet) => {
						if (err) {
							return cb(err);
						}
						if (code !== wallet) {
							res.status(500);
							return cb('Wrong token');
						}
						return cb(null, wallet);
					});
				}, (wallet, cb) => {
					this.wallet.getWallet(wallet, (err, response) => {
						if (err) {
							return cb(err);
						}
						if (!response.email || (response.email.value != email)) {
							return cb('Wrong token');
						}
						if (response.email.verified) {
							return cb('Email is already verified');
						}
						return cb(null, wallet);
					});
				}, (wallet, cb) => {
					this.wallet.updateWallet(wallet, 'email', { value: email, verified: true }, cb);
				}], (err) => {
					if (err) {
						res.status(500);
						return res.send({err});
					}
					this.wallet.getWallet(code, (err, response) => {
						return res.send({ err, response });
					});
				});
			})
		} else {
			res.status(500);
			res.send({ err: 'Token is required' })
		}
	});

	// protected by token apis
	router.get('/wallet', jwt({ secret: process.env.JWT_SECRET }), (req, res) => {
		if (req.user && req.user.wallet) {
			this.wallet.getWallet(req.user.wallet, (err, response) => {
				if (err) {
					res.status(500);
					return res.send(err)
				}
				res.send({ token: this.jwt.create({ wallet: response.code }), response });
			})
		} else {
			res.sendStatus(500)
		}
	});

	router.post('/email', jwt({ secret: process.env.JWT_SECRET }), (req, res) => {
		if (req.user && req.user.wallet && req.body && req.body.value) {
			const email = req.body.value.toLowerCase(),
				code = req.user.wallet;
			async.waterfall([
				(cb) => {
					this.email.get(email, (err, resp) => {
						if (err || resp) {
							return cb(err || 'Email is already taken')
						}
						cb(null, null)
					});
				},
				(_, cb) => {
					this.wallet.getWallet(code, (err, resp) => {
						if (err || !resp) {
							return cb(err || 'Wallet doesn\'t exist');
						}
						if (resp.email) {
							return cb('Wallet has email');
						}
						cb(null, null)
					})
				},
				(_, cb) => {
					this.email.create(email, code, cb);
				},
				(_, cb) => {
					this.email.sendLink({value: email}, code, (err, resp) => {
						console.log('sended link', {err, resp})
					});
					setImmediate(cb)
				},
			], (err, _) => {
				if (err) {
					res.status(500);
					return res.send(err)
				}
				res.send({ token: this.jwt.create({ wallet: code }), response: OK });
			});
		} else {
			res.sendStatus(500)
		}
	});

	router.get('/resend', jwt({ secret: process.env.JWT_SECRET }), (req, res) => {
		if (req.user && req.user.wallet) {
			const code = req.user.wallet;
			async.waterfall([
				(cb) => {
					this.wallet.getWallet(code, (err, resp) => {
						if (err || !resp) {
							return cb(err || 'Wallet doesn\'t exist');
						}
						if (!resp.email) {
							return cb('Wallet doesn\'t have email');
						}
						cb(null, resp.email)
					})
				},
				(email, cb) => {
					this.email.sendLink(email, code, () => {
					});
					setImmediate(cb);
				}
			], (err, _) => {
				if (err) {
					res.status(500);
					return res.send(err)
				}
				res.send({ token: this.jwt.create({ wallet: code }), response: OK });
			});
		} else {
			res.sendStatus(500)
		}
	});

	this.express.use('/', router);

	return Promise.resolve();
};
