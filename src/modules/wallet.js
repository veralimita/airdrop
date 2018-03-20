const async = require('async'),
	quit = Symbol('quit');

class Wallet {
	constructor (redis) {
		redis.createClient('wallet', (err, client)=>{
			this.client = client;
		});
	}

	[quit] () {
		this.client && this.client.quit();
	}

	createWallet(code, cb){
		this.client.set(code, 100, (err, result) => {
			cb(err, code);
		});
	}
}

module.exports = function () {

	this.wallet = new Wallet(this.redis);
	this.on('quit', () => {
		console.log('QUIT FROM WALLET');
		this.wallet[quit];
	});

	return Promise.resolve();
};
