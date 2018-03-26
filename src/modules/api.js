const express = require('express'),
	async = require('async');

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

	this.express.use('/', router);

	return Promise.resolve();
};
