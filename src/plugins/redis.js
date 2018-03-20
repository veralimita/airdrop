const redis = require("redis");

class Redis {
	constructor () {
		this.map = { 'codes': 0, 'wallet': 1 }
	}

	createClient (db, cb) {
		if(this.map[db] === undefined) return cb && cb(new Error(`DB:${db} doesn't exist`));
		const client = redis.createClient();
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
