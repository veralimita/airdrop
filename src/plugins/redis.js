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
		console.log(process.env.REDIS_PORT_6379_TCP_PORT,
			process.env.REDIS_PORT_6379_TCP_ADDR);
		const client = redis.createClient(
			process.env.REDIS_PORT_6379_TCP_PORT,
			process.env.REDIS_PORT_6379_TCP_ADDR
		);
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
