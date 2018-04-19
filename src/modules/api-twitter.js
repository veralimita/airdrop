const express = require('express'),
	async = require('async'),
	cookiesLive = parseInt(process.env.COOKIES_HOURS) * 60 * 60 * 1000,
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	//TWITTER login API
	router.get('/login', this.passport.authenticate('twitter'));

	router.get('/connect',
		this.passport.authenticate('twitter', {failureRedirect: 'http://localhost:8000/login?twerrcode=1'}),
		(req, res) => {
			if (!req.user || !req.user.id) {
				return res.send({error: 'Ooooooooooh! NO!'})
			}

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
			], (error, response) => {
				if (error) {
					return res.status(500).send({error})
				}
				const token = this.jwt.create({wallet: response, twitter: req.user.id})
				return res.cookie('auth-token', token, {
					maxAge: cookiesLive,
					overwrite: true,
					httpOnly: false
				}).redirect('http://localhost:8000/wallet')
			})
		});


	this.express.use('/twitter', router);

	return Promise.resolve();
};
