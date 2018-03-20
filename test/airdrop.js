const assert = require('assert'),
	storage = require('../src/modules/storage.js');

const EventEmitter = require('events')

require("colors")

class Core extends EventEmitter {
	constructor () {
		super();

		this.config = require('nodejs-config')(
			__dirname,
			function () {
				return process.env.NODE_ENV;
			}
		);
	}

	async initialize () {
		await Promise.all(require('../src/plugins').map(async (module) => {
			return await module.call(this).catch(console.error)
		}));

		await Promise.all(require('../src/modules').map(async (module) => {
			return await module.call(this).catch(console.error)
		}));

		console.log("app ready")
		this.emit("ready");
	}

	static async create () {
		const o = new Core();
		await o.initialize();
		return o;
	}

	quit () {
		this.emit('quit');
	}
}


let core;


describe('TEST', () => {
	before(() => {
		let token;
		return Core.create().then((_core) => {
			core = _core;
		});
	});
	after(() => {
		return core.quit();
	});
	describe('Storage', () => {
		describe('Exists', () => {
			it('should return Storage object', () => {
				assert.ok(typeof core.storage === 'object')
			});
		});
		describe('Random code', () => {
			it('should return random code', (done) => {
				core.storage.getRandomCode((err, resp) => {
					if (err) done(err);
					else {
						token = resp;
						done();
					}
				})
			})
		});
		describe('Token', () => {
			it('should token be 15 chars length', () => {
				assert.ok(token.length === 14)
			});
		});
	});
});
