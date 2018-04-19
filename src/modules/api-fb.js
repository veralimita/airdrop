const express = require('express'),
	async = require('async'),
	cookiesLive = parseInt(process.env.COOKIES_HOURS) * 60 * 60 * 1000,
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	//FB API callback
	router.get('/connect', (req, res) => {
		this.fb.processCode(req.query.code, (error, result) => {
			if (error) {
				console.error(error)
				return res.redirect('http://localhost:8000/login?fberrcode=1');
			}

			if (!result.user || !result.user.id) {
				return res.send({error: 'Ooooooooooh! NO!'})
			}

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
				}
			], (error, response) => {
				if (error) {
					return res.status(500).send({error})
				}
				const token = this.jwt.create({wallet: response, facebook: result.user.id})
				return res.cookie('auth-token', token, {
					maxAge: cookiesLive,
					overwrite: true,
					httpOnly: false
				}).redirect('http://localhost:8000/wallet')
			})
		})
	});

	this.express.use('/fb', router);

	return Promise.resolve();
};
