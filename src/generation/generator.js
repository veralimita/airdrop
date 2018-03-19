const dictionary = 'PQFM7BHWZ0RCTG46VKA928JENX5S1Y3D',
	fs = require('fs'),
	async = require('async'),
	BigMap = require('big-map');

const codes = new BigMap(10, 1);
const wstream = fs.createWriteStream('./output.csv');

function formatCode (code) {
	return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`
}

function hashSum (value) {
	let sum = 0;
	for (let i = 0; i < value.length - 2; i++) {
		sum += dictionary.indexOf(value[i]);
	}
	for (let i = value.length - 2; i < value.length; i++) {
		sum = sum * dictionary.indexOf(value[i]);
	}
	return (sum % 1023) + 1
}

function convertSum (value) {
	let hash = value.toString(32);
	if (hash.length != 2) {
		hash = `0${hash}`
	}
	return hash.toUpperCase()
}

function generateId () {
	let id = getLetter();
	for (let i = 1; i < 10; i++) {
		id = id + getLetter(id.substr(-1, 1))
	}
	if (codes.get(id)) return null
	codes.set(id, '1')
	return id
}

function getLetter (prev) {
	let letter = dictionary[Math.floor(Math.random() * dictionary.length)];
	let sameLatter = (letter != prev);
	let twoNumbers = !isNaN(prev) && !isNaN(letter);
	if (sameLatter && !twoNumbers) return letter;
	return getLetter(prev)
}

async.whilst(() => codes.size < 2000000, (cb) => {
	let code = generateId();
	if (code) {
		if (!(codes.size % 1000)) {
			console.log(codes.size)
		}
		let formattedCode = formatCode(code + convertSum(hashSum(code)));
		wstream.write(`${formattedCode}\n`, cb);
	} else {
		setImmediate(cb);
	}
}, (err) => {
	wstream.end();
})

