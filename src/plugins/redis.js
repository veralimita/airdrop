const redis = require("redis");

class Redis {
	constructor () {
		this.map = {
			'codes': 0,
			'wallet': 1
		}
	}

	createClient (db, cb) {
		if (this.map[db] === undefined) return cb && cb(new Error(`DB:${db} doesn't exist`));
		const client = redis.createClient(
			process.env.REDIS_PORT_6379_TCP_PORT,
			process.env.REDIS_PORT_6379_TCP_ADDR,
			{db: this.map[db]}
		);

		client.on('error', (err) => {
			//console.error("Redis ERROR", err.message);
		});

		client.once('end', () => {
			setTimeout(() => {
				this.createClient(db, cb);
			}, 1000);
		});

		client.select(db, () => {
			cb && cb(null, client)
		})
	}
}

module.exports = function () {

	this.on("ready", () => {

	})

	this.redis = new Redis();

	return Promise.resolve();
}
