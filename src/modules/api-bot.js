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

	this.express.use('/bot', router);

	return Promise.resolve();
};
