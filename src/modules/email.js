const async = require('async'),
	quit = Symbol('quit');

class Email {
	constructor(app, cb) {
		this.app = app;
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
			cb(err);
		});
	}

	[quit]() {
		this.client && this.client.quit();
	}

	create(email, code, cb) {

		async.parallel([
			(cb) => {
				this.client.set(`email:${email}`, code, "NX", cb)
			},
			(cb) => {
				this.app.wallet.updateWallet(code, 'email', JSON.stringify({value: email, verified: false}), cb);
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
				], (err) => {
					console.log('CREATE EMAIL ROLLBACK:', err ? 'failed' : 'success')
					cb(err, results)
				})
			}
			else {
				this.sendLink(email, code, (err) => {
					cb(err, results)
				})
			}
		});
	}

	get(email, cb) {
		this.client.get(`email:${email}`, cb);
	}

	delete(email, cb) {
		this.client.del(`email:${email}`, cb);
	}

	sendLink(email, code, cb) {
		this.app.rabbitConnect.send({
			email,
			code
		}, "email.verification", cb);
	}

	static listenVerification(core) {
		core.rabbitConnect.listen("email.verification", (err, msg) => {
			if (err) {
				console.error(err)
				return setTimeout(() => Email.listenVerification(core), 1000)
			}

			const payload = JSON.parse(msg.payload) //validate content

			async.waterfall([
				(cb) => {
					const token = core.jwt.create(payload, '24h');
					core.emailCompilator.getHtml('verification', 'Verification email', [process.env.EMAIL_VALIDATION_LINK + token], cb)
				},
				(body, cb) => {
					core.smtp.send(payload.email && payload.email.value, 'Verification email', body, cb)
				},
			], (err) => {
				console.error(err)
				msg.release();
			})
		});
	}

}

module.exports = function () {
	return new Promise((resolve, reject)=>{
		this.email = new Email(this, (err)=>{
			if (err){
				return reject(err);
			}
			resolve();
		});
		this.on('quit', () => {
			this.email[quit];
		});
		this.on('ready', () => {
			Email.listenVerification(this);
		});
	});
};
