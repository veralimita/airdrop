const express = require('express'),
	async = require('async'),
	cookiesLive = parseInt(process.env.COOKIES_HOURS) * 60 * 60 * 1000,
	OK = 'OK';

module.exports = function () {
	const router = express.Router();

	//GOOGLE login API
	router.get('/login', this.passport.authenticate('google', {
		scope: ['https://www.googleapis.com/auth/userinfo.profile']
	}));

	router.get('/connect',
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
				], (error, response) => {
					if (error) {
						return res.status(500).send({error})
					}

					const token = this.jwt.create({wallet: response, google: req.user.profile.id})
					return res.cookie('auth-token', token, {
						maxAge: cookiesLive,
						overwrite: true,
						httpOnly: false
					}).redirect('http://localhost:8000/wallet')
				})

			} else {
				res.send({error: 'Ooooooooooh! NO!'})
			}
		}
	);

	this.express.use('/google', router);

	return Promise.resolve();
};
