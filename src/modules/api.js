const express = require('express');

module.exports = function () {
	const router = express.Router();

	router.get('/code', (req, res) => {
		this.storage.getRandomCode((err, response) => {
				res.send({ err, response });
			}
		);

	});

	this.express.use('/', router);

	return Promise.resolve();
};
