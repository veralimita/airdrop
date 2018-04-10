const assert = require("assert"),
	async = require('async'),
	FB = require("fb"),
	quit = Symbol('quit'),
	request = require("request");

class FbAPI {
	constructor (app) {
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
		this.client_id = process.env.FB_CLIENT_ID
		this.client_secret = process.env.FB_CLIENT_SECRET
	}

	[quit] () {
		this.client && this.client.quit();
	}

	create (user, cb) {
		console.log('creating', user)
		async.waterfall([
			(cb) => {
				this.get(user.id, (err, result) => {
					if (err || result) {
						return cb(err || 'This FB user already exists')
					}
					cb(null)
				})
			},
			(cb) => {
				this.client.set(`fb:${user.id}`, 'CREATED', (err, res) => {
					cb(err, 'CREATED')
				})
			}
		], (err, results) => {
			if (err) {
				//rollback
				async.parallel([
					(cb) => {
						this.delete(user.id, cb);
					}
				], (err) => {
					console.log('CREATE FB ROLLBACK:', err ? 'failed' : 'success')
					cb(err || 'Create failed')
				})
			} else {
				cb(err, results);
			}
		});
	}

	processCode (code, cb) {
		async.autoInject(
			{
				exchange: (cb) => {
					request({
						"method": "POST",
						"uri": `https://graph.facebook.com/v2.3/oauth/access_token`,
						"qs": {
							client_id: this.client_id,
							redirect_uri: "http://localhost:8080/connect",
							client_secret: this.client_secret,
							code: code
						}
					}, (err, res, body) => {
						if (!err && (res.statusCode > 0 && res.statusCode < 400)) {
							cb(null, JSON.parse(body))
						} else {
							cb(err || body || res.statusCode)
						}
					});
				},
				user: (exchange, cb) => {
					FB.api('me', { fields: ['id', 'name', 'email'], access_token: exchange.access_token }, (response) => {
						cb(null, response);
					});
				}
			},
			cb
		)
	}

	get (id, cb) {
		this.client.get(`fb:${id}`, cb);
	}

	update (id, code, cb) {
		this.client.set(`fb:${id}`, code, (err, res) => {
			console.log('UPDATE', err, res)
			cb(err, res)
		})
	}

	delete (id, cb) {
		this.client.del(`fb:${id}`, cb);
	}
}

module.exports = function () {

	this.fb = new FbAPI(this);

	this.on('quit', () => {
		this.fb[quit];
	});

	return Promise.resolve();
}
