const EventEmitter = require('events')

require("colors")

class Core extends EventEmitter {
	constructor() {
		super();

		this.config = require('nodejs-config')(
			__dirname,
			function()
			{
				return process.env.NODE_ENV;
			}
		);
	}

	async initialize() {
		await Promise.all(require('./plugins').map(async (module) => {
			return await module.call(this).catch(console.error)
		}));

		await Promise.all(require('./modules').map(async (module) => {
			return await module.call(this).catch(console.error)
		}));

		if (process.env.NODE_ENV == 'test') {
			await Promise.all(require('./test').map(async (module) => {
				return await module.call(this).catch(console.error)
			}));
		}

		console.log("app ready")
		this.emit("ready");
	}

	static async create() {
		const o = new Core();
		await o.initialize();
		return o;
	}
}

Core.create();

