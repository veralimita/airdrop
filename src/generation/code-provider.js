const redis = require('redis'),
	client = redis.createClient(),
	async = require('async');


async.waterfall(
	[
		(cb) => {
			client.send_command('RANDOMKEY', cb);
		},
		(key, cb) => {
			client.del(key, (err) => {
				cb(err, key)
			});
		},
	],
	(err, result) => {
		console.log(0, result);
	})
