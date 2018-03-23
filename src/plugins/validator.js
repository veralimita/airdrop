class Dictionary {
	constructor (dict) {
		this.__dictionary = dict;
	}

	codeIsValid (code) {
		const formattedCode = this.__formatCode(code);
		const verifiedCode = formattedCode + this.__convertSum(this.__hashSum(code));
		return (formattedCode === verifiedCode);
	}

	__hashSum (value) {
		let sum = 0;
		for (let i = 0; i < value.length - 4; i++) {
			sum += this.__dictionary.indexOf(value[i]);
		}
		for (let i = value.length - 4; i < value.length - 2; i++) {
			sum = sum * this.__dictionary.indexOf(value[i]);
		}
		return (sum % 1023) + 1
	}

	__convertSum (value) {
		let hash = value.toString(32);
		if (hash.length != 2) {
			hash = `0${hash}`
		}
		return hash.toUpperCase()
	}


	__formatCode (code) {
		return code.replace(/-/g, '');
	}
}

module.exports = function () {
	this.on("ready", () => {

	});

	this.dictionary = new Dictionary('PQFM7BHWZ0RCTG46VKA928JENX5S1Y3D');

	return Promise.resolve();
}
