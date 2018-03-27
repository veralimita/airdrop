const assert = require("assert"),
	jsonwebtoken = require('jsonwebtoken');

class JWT {
	constructor (secret) {
		this.secret = secret;
	}

	create (data) {
		return jsonwebtoken.sign(data, this.secret, { expiresIn: '1h' });
	}
}

module.exports = function () {

	assert(!this.jwt, "field exists");
	this.jwt = new JWT(process.env.JWT_SECRET);

	return Promise.resolve();
}