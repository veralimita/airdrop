const nodemailer = require('nodemailer');

class Smtp {
	constructor () {
		const config = {
			service: "gmail",
			"auth": {
				"user": process.env.SMTP_USER,
				"pass": process.env.SMTP_PASS
			},
			"tls": {
				"ciphers": "SSLv3"
			}
		}

		this.transporter = nodemailer.createTransport(config);
	}

	send (address, subject, html, cb) {
		console.log('SEND EMAIL TO', address);
		this.transporter.sendMail({
			from: process.env.SMTP_USER,
			to: address,
			subject: subject,
			html: html
		}, cb);
	}
}


module.exports = function () {
	this.on("ready", () => {

	});

	this.smtp = new Smtp();

	return Promise.resolve();
}
