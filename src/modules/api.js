const express = require('express'),
	async = require('async'),
	jwt = require('express-jwt'),
	cookiesLive = parseInt(process.env.COOKIES_HOURS) * 60 * 60 * 1000,
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	//FB API callback
	router.get('/connect', (req, res) => {
		this.fb.processCode(req.query.code, (error, result) => {
			if (error) {
				return res.redirect('http://localhost:8000/login?fberrcode=1');
			}
			if (result.user && result.user.id) {
				async.waterfall([
					(cb) => {
						this.fb.get(result.user.id, cb)
					},
					(fbUser, cb) => {
						if (fbUser) {
							setImmediate(cb, null, fbUser)
						} else {
							this.fb.create(result.user, cb)
						}
					},
					(fbUser, cb) => {
						setImmediate(cb, null, fbUser)
					}
				], (error, response) => {
					if (error) {
						return res.status(500).send({ error })
					}
					const token = this.jwt.create({ wallet: response, facebook: result.user.id })
					return res.cookie('auth-token', token, { maxAge: cookiesLive }).redirect('http://localhost:8000/wallet')
				})

			} else {
				res.send({ error: 'Ooooooooooh! NO!' })
			}
		})
	});

	//TWITTER login API
	router.get('/twitter-login', this.passport.authenticate('twitter'));

	router.get('/twitter-connect',
		this.passport.authenticate('twitter', { failureRedirect: 'http://localhost:8000/login?twerrcode=1' }),
		(req, res) => {
			if (req.user && req.user.id) {
				async.waterfall([
					(cb) => {
						this.twitter.get(req.user.id, cb)
					},
					(twitterUser, cb) => {
						if (twitterUser) {
							setImmediate(cb, null, twitterUser)
						} else {
							this.twitter.create(req.user, cb)
						}
					},
					(twitterUser, cb) => {
						setImmediate(cb, null, twitterUser)
					}
				], (error, response) => {
					if (error) {
						return res.status(500).send({ error })
					}
					const token = this.jwt.create({ wallet: response, twitter: req.user.id })
					return res.cookie('auth-token', token, { maxAge: cookiesLive }).redirect('http://localhost:8000/wallet')
				})
			} else {
				res.send({ error: 'Ooooooooooh! NO!' })
			}
		});

	//GOOGLE login API
	router.get('/google-login', this.passport.authenticate('google', {
		scope: ['https://www.googleapis.com/auth/userinfo.profile']
	}));
	router.get('/google-connect',
		this.passport.authenticate('google', {
			failureRedirect: 'http://localhost:8000/login?goerrcode=1'
		}),
		(req, res) => {
			if (req.user && req.user.profile && req.user.profile.id) {
				async.waterfall([
					(cb) => {
						this.google.get(req.user.profile.id, cb)
					},
					(googleUser, cb) => {
						if (googleUser) {
							setImmediate(cb, null, googleUser)
						} else {
							this.google.create(req.user.profile, cb)
						}
					},
					(googleUser, cb) => {
						setImmediate(cb, null, googleUser)
					}
				], (error, response) => {
					if (error) {
						return res.status(500).send({ error })
					}

					const token = this.jwt.create({ wallet: response, google: req.user.profile.id })
					return res.cookie('auth-token', token, { maxAge: cookiesLive }).redirect('http://localhost:8000/wallet')
				})

			} else {
				res.send({ error: 'Ooooooooooh! NO!' })
			}
		}
	);
	router.post('/code', (req, res) => {
		console.log('TOKEN API')
		if (req.body && req.body.source) {
			switch (req.body.source) {
				case 'rocketchat':
					async.waterfall(
						[
							(cb) => {
								this.rocketchat.getUser(req.body.payload, (error, result) => {
									if (error || result) {
										return cb(error || 'Rocketchat user already exists')
									}
									cb(null, null)
								});
							},
							(arg, cb) => {
								this.storage.getRandomCode(cb);
							},
							(code, cb) => {
								this.rocketchat.createUser(req.body.payload, code, (error, response) => {
									cb(error, code)
								})
							}
						], (error, response) => {
							res.send({ error, response });
						});
					break;
				case 'telegram':
					async.waterfall(
						[
							(cb) => {
								this.telegram.getUser(req.body.payload, (error, result) => {
									if (error || result) {
										return cb(error || 'Telegram user already exists')
									}
									cb(null, null)
								});
							},
							(arg, cb) => {
								this.storage.getRandomCode(cb);
							},
							(code, cb) => {
								this.telegram.createUser(req.body.payload, code, (error, response) => {
									cb(error, code)
								})
							}
						], (error, response) => {
							res.send({ error, response });
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
								this.rocketchat.getUser(req.body.payload, (error, result) => {
									if (error || !result) {
										return cb(error || 'Rocketchat user doesn\'t exist')
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
							res.send({ error, response });
						});
					break;
				case 'telegram':
					async.waterfall(
						[
							(cb) => {
								this.telegram.getUser(req.body.payload, (error, result) => {
									if (error || !result) {
										return cb(error || 'Telegram user doesn\'t exist')
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
							res.send({ error, response });
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
					this.wallet.getWallet(code, (error, resp) => {
						if (error || !resp) {
							return cb(error || 'Wallet doesn\'t exist');
						}
						cb(null, resp);
					})
				},
				(wallet, cb) => {
					if (!wallet.telegram && !wallet.rocketchat && (!wallet.email || !wallet.email.verified)) {
						return setImmediate(cb, 'Cant provide password to this wallet');
					}
					this.password.create(code, (error, pwd) => {
						cb(error, { wallet, pwd })
					});
				}
			], (error, result) => {
				if (error) {
					res.status(500);
					return res.send({ error });
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
					this.wallet.getWallet(code, (error, resp) => {
						if (error || !resp) {
							return cb(error || 'Wallet doesn\'t exist');
						}
						cb(null, resp);
					})
				},
				(wallet, cb) => {
					this.password.getPassword(pwd, (error, resp) => {
						if (error || !resp || (resp !== code)) {
							return cb(error || 'Password is incorrect');
						}
						cb(null, resp);
						this.password.deletePassword(pwd, () => {
							//TODO error handing
						})
					})
				}
			], (error) => {
				if (error) {
					return res.status(500).send({ error });
				}
				res.send({ token: this.jwt.create({ wallet: code }) });
			})
		} else {
			res.sendStatus(500);
		}
	});

	router.get('/validate', (req, res) => {
		if (req.query && req.query.token) {
			this.jwt.verify(req.query.token, (error, decoded) => {
				if (error) {
					res.status(500);
					return res.send({ error });
				}
				if (!decoded.code || !decoded.email) {
					res.status(500);
					return res.send({ error: 'Token is broken' })
				}
				const email = decoded.email.value;
				const code = decoded.code;

				async.waterfall([(cb) => {
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
				}, (wallet, cb) => {
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
				}, (wallet, cb) => {
					this.wallet.updateWallet(wallet, 'email', { value: email, verified: true }, cb);
				}], (error) => {
					if (error) {
						res.status(500);
						return res.send({ error });
					}
					this.wallet.getWallet(code, (error, response) => {
						return res.send({ error, response });
					});
				});
			})
		} else {
			res.status(500);
			res.send({ error: 'Token is required' })
		}
	});

	// protected by token apis
	router.get('/wallet', jwt({ secret: process.env.JWT_SECRET }), (req, res) => {
		if (req.user && req.user.wallet) {
			if (req.user.wallet === 'CREATED') {
				if (req.user.google) {
					this.google.get(req.user.google, (err, code) => {
						this.wallet.getWallet(code, (err, resp) => {
							const token = this.jwt.create({
								wallet: resp || 'CREATED',
								google: req.user.google
							})
							return res.cookie('auth-token', token, { maxAge: cookiesLive }).send({ response: { code: resp || 'CREATED' } })
						})
					})
				} else if (req.user.twitter) {
					this.twitter.get(req.user.twitter, (err, code) => {
						this.wallet.getWallet(code, (err, resp) => {
							const token = this.jwt.create({
								wallet: resp || 'CREATED',
								twitter: req.user.twitter
							})
							return res.cookie('auth-token', token, { maxAge: cookiesLive }).send({ response: { code: resp || 'CREATED' } })
						})
					})
				} else if (req.user.facebook) {
					this.fb.get(req.user.facebook, (err, code) => {
						console.log('fb code', code)
						this.wallet.getWallet(code, (err, resp) => {
							console.log('wallet', resp)
							const token = this.jwt.create({
								wallet: resp || 'CREATED',
								facebook: req.user.facebook
							})
							return res.cookie('auth-token', token, { maxAge: cookiesLive }).send({ response: { code: resp || 'CREATED' } })
						})
					})
				} else {
					const token = this.jwt.create({
						wallet: req.user.wallet,
						facebook: req.user.facebook,
						twitter: req.user.twitter,
						google: req.user.google
					})
					return res.cookie('auth-token', token, { maxAge: cookiesLive }).send({ response: { code: null } })
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
						return res.status(500).cookie('auth-token', token, { maxAge: cookiesLive }).send({ error })
					}
					return res.cookie('auth-token', token, { maxAge: cookiesLive }).send({ response });
				})
			}
		} else {
			res.status(500).send({ error: 'Wallet doesnt exist' })
		}
	});

	router.post('/token', jwt({ secret: process.env.JWT_SECRET }), (req, res) => {
		if (req.user && req.user.wallet) {
			if (req.user.wallet !== 'CREATED') {
				return res.status(500).send({ error: 'Wallet token exists' })
			}
			const code = req.body && req.body.code;
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
						return res.status(500).send({ error });
					}
					// normal response
					const token = this.jwt.create({
						wallet: response.wallet
					})
					return res.cookie('auth-token', token, { maxAge: cookiesLive }).send({ response: response.wallet })
				}
			)
		} else {
			res.status(500).send({ error: 'Wallet doesnt exist' })
		}
	});

	router.post('/email', jwt({ secret: process.env.JWT_SECRET }), (req, res) => {
		if (req.user && req.user.wallet && req.body && req.body.value) {
			const email = req.body.value.toLowerCase(),
				code = req.user.wallet;
			async.waterfall([
				(cb) => {
					this.email.get(email, (error, resp) => {
						if (error || resp) {
							return cb(error || 'Email is already taken')
						}
						cb(null, null)
					});
				},
				(_, cb) => {
					this.wallet.getWallet(code, (error, resp) => {
						if (error || !resp) {
							return cb(error || 'Wallet doesn\'t exist');
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
					this.email.sendLink({ value: email }, code, (error, resp) => {
						console.log('sended link', { error, resp })
					});
					setImmediate(cb)
				},
			], (error, _) => {
				if (error) {
					res.status(500);
					return res.send({ error })
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
					this.email.sendLink(email, code, () => {
					});
					setImmediate(cb);
				}
			], (error, _) => {
				if (error) {
					res.status(500);
					return res.send({ error })
				}
				res.send({ token: this.jwt.create({ wallet: code }), response: OK });
			});
		} else {
			res.sendStatus(500)
		}
	});

	this.express.use('/', router);

	this.express.use((error, req, res, next) => {
		if (error.name === 'UnauthorizedError') {
			res.status(error.status).send({ message: error.message });
			return;
		}
		next();
	});

	return Promise.resolve();
};
