const assert = require("assert"),
	async = require('async'),
	TwitterAPI = require("node-twitter-api"),
	quit = Symbol('quit');

class Twitter {
	constructor(app, cb) {
		app.redis.createClient('wallet', (err, client) => {
			this.client = client;
			cb(err);
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

	[quit]() {
		this.client && this.client.quit();
	}

	getRequestToken(cb) {
		this.twitter.getRequestToken(cb)
	}

	//
	create(user, cb) {
		this.client.set(`twitter:${user.id}`, 'CREATED', 'NX', (err) => {
			cb(err, 'CREATED')
		})
	}

	get(id, cb) {
		this.client.get(`twitter:${id}`, cb);
	}

	update(id, code, cb) {
		this.client.set(`twitter:${id}`, code, (err, res) => {
			console.log('UPDATE', err, res)
			cb(err, res)
		})
	}

	delete(id, cb) {
		this.client.del(`twitter:${id}`, cb);
	}
}

module.exports = function () {
	return new Promise((resolve, reject) => {
		this.twitter = new Twitter(this, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});

		this.on('quit', () => {
			this.twitter[quit];
		});
	})
}
