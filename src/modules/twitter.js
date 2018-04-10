const assert = require("assert"),
	async = require('async'),
	TwitterAPI = require("node-twitter-api"),
	quit = Symbol('quit');

class Twitter {
	constructor (app) {
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
		});
		this.client_key = process.env.TWITTER_CONSUMER_KEY
		this.client_secret = process.env.TWITTER_CONSUMER_SECRET
		this.client_callback = process.env.TWITTER_CALLBACK
		this.twitter = new TwitterAPI({
			consumerKey: this.client_key,
			consumerSecret: this.client_secret,
			callback: this.client_callback
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	getRequestToken (cb) {
		this.twitter.getRequestToken(cb)
	}

	//
	create (user, cb) {
		async.waterfall([
			(cb) => {
				this.get(user.id, (err, result) => {
					if (err || result) {
						return cb(err || 'This Twitter user already exists')
					}
					cb(null)
				})
			},
			(cb) => {
				this.client.set(`twitter:${user.id}`, 'CREATED', (err, res) => {
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
					console.log('CREATE Twitter ROLLBACK:', err ? 'failed' : 'success')
					cb(err || 'Update failed')
				})
			} else {
				cb(err, results);
			}
		});
	}

	get (id, cb) {
		this.client.get(`twitter:${id}`, cb);
	}

	update (id, code, cb) {
		this.client.set(`twitter:${id}`, code, (err, res) => {
			console.log('UPDATE', err, res)
			cb(err, res)
		})
	}

	delete (id, cb) {
		this.client.del(`twitter:${id}`, cb);
	}
}

module.exports = function () {

	this.twitter = new Twitter(this);

	this.on('quit', () => {
		this.twitter[quit];
	});

	return Promise.resolve();
}
