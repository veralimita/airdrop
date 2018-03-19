const glob = require("glob")

const modules = glob.sync("./*.js", {cwd: __dirname})
	.filter((file) => {
		return file !== "./index.js";
	})
	.map((file) => {
		return require(file)
	})

module.exports = modules;