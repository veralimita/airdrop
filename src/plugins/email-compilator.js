const compile = require('string-template/compile'),
	fs = require('fs'),
	async = require('async'),
	path = require('path'),
	_getFile = Symbol('_getFile');

class EmailCompilator {
	constructor () {

	}

	[_getFile] (file, cb) {
		fs.readFile(path.join(__dirname, `../email-templates/${file}.html`), 'utf8', cb)
	}

	getHtml (file, title, args, cb) {
		async.parallel({
			wrapper:
				(cb) => {
					this[_getFile]('wrapper', cb)
				},
			body: (cb) => {
				this[_getFile](file, cb)
			}
		}, (err, results) => {
			if (err) {
				return cb(err);
			}
			const body_template = compile(results.body, true);
			const html_template = compile(results.wrapper, true);
			const html = html_template([title, body_template(args)]);
			cb(null, html);
		})
	}

}


module.exports = function () {
	this.on("ready", () => {

	});

	this.emailCompilator = new EmailCompilator();

	return Promise.resolve();
}
