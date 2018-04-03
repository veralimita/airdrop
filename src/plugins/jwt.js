const assert = require("assert"),
	jsonwebtoken = require('jsonwebtoken'),
	__secret = Symbol('secret');

class JWT {
	constructor (secret) {
		this[__secret] = secret;
	}

	create (data, expiresIn) {
		return jsonwebtoken.sign(data, this[__secret], { expiresIn: expiresIn || '1h'});
	}

	verify (token, cb) {
		jsonwebtoken.verify(token, this[__secret], cb);
	}
}

module.exports = function () {

	assert(!this.jwt, "field exists");
	this.jwt = new JWT(process.env.JWT_SECRET);

	return Promise.resolve();
}