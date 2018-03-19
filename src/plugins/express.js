const assert = require("assert"),
	express = require('express'),
	cors = require('cors'),
	expressDomainMiddleware = require('express-domain-middleware'),
	http = require('http'),
	bodyParser = require('body-parser'),
	path = require('path'),
	methodOverride = require('method-override'),
	crypto = require('crypto'),
	base64url = require('b64url');

function parse_signed_request(signed_request, secret) {
	if (!signed_request) {
		return null;
	}
	const encoded_data = signed_request.split('.', 2);
	// decode the data
	const sig = encoded_data[0];
	const json = base64url.decode(encoded_data[1]);
	const data = JSON.parse(json); // ERROR Occurs Here!

	// check algorithm - not relevant to error
	if (!data.algorithm || data.algorithm.toUpperCase() != 'HMAC-SHA256') {
		console.error('Unknown algorithm. Expected HMAC-SHA256');
		return null;
	}

	// check sig - not relevant to error
	const expected_sig = crypto.createHmac('sha256', secret).update(encoded_data[1]).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace('=', '');
	if (sig !== expected_sig) {
		return null;
	}

	return data;
}

module.exports = function () {
	this.config.set("project.port", 8080)

	assert(!this.express, "field exists")
	this.express = express();

	this.express.use(cors());
	this.express.use(expressDomainMiddleware);
	this.express.use(bodyParser.urlencoded({extended: true, parameterLimit: 5000}));
	this.express.use(bodyParser.json({limit: '1mb'}));
	this.express.use(methodOverride());
	this.express.engine('html', require('ejs').renderFile);
	this.express.use(require('express-domain-middleware'));
	this.express.set('view engine', 'ejs');
	this.express.set('views', path.join(__dirname, '../../public/dist'));
	this.express.use(express.static(path.join(__dirname, '../../public/dist')));

	assert(!this.server, "field exists")
	this.server = http.createServer(this.express);

	this.on("ready", () => {
		this.server.listen(this.config.get("project.port"), (err) => {
			if (err) {
				return console.error("server", err)
			}
			console.info("listening", this.config.get("project.port"));
		});
	});

	return Promise.resolve();
}
