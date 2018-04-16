const async = require('async'),
	quit = Symbol('quit');

class Email {
	constructor (app) {
		this.app = app;
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	create (email, code, cb) {
		async.waterfall([(cb) => {
			this.get(email, (err, result) => {
				if (err || result) {
					return cb(err || 'This email is already used')
				}
				cb(null, code)
			})
		},
			(_, cb) => {
				async.parallel([
					(cb) => {
						this.client.set(`email:${email}`, code, cb)
					},
					(cb) => {
						this.app.wallet.updateWallet(code, 'email', { value: email, verified: false }, cb);
					}
				], cb);
			}
		], (err, results) => {
			if (err) {
				//rollback
				async.parallel([
					(cb) => {
						this.delete(email, cb);
					},
					(cb) => {
						this.app.wallet.updateWallet(code, 'email', null, cb);
					}
				], (err, results) => {
					console.log('CREATE EMAIL ROLLBACK:', err ? 'failed' : 'success')
				})
			}
			else {
				this.sendLink(email, code, () => {
					//TODO catch error
				})
			}
			cb(err, results);
		});
	}

	get (email, cb) {
		this.client.get(`email:${email}`, cb);
	}

	delete (email, cb) {
		this.client.del(`email:${email}`, cb);
	}

	sendLink (email, code, cb) {
		async.waterfall([
			(cb) => {
				const token = this.app.jwt.create({ email, code }, '24h');
				this.app.emailCompilator.getHtml('verification', 'Verification email', [process.env.EMAIL_VALIDATION_LINK + token], cb)
			},
			(body, cb) => {
				this.app.smtp.send(email && email.value, 'Verification email', body, cb)
			},
		], cb)

	}

}

module.exports = function () {
	this.email = new Email(this);

	this.on('quit', () => {
		this.email[quit];
	});


	return Promise.resolve();
};
