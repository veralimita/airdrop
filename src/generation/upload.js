const redis = require("redis"),
	client = redis.createClient(),
	fs = require('fs'),
  lineReader = require('line-reader');

client.on("error", (err) => {
	console.log("Error " + err);
});

let i = 0;
let arr = [];
lineReader.eachLine('./output.csv', (line, last, cb)=> {
	i++;
	arr.push(line);
	arr.push(1);
	if (i%1000 === 0 || last) {
		console.log(i);
		client.mset(arr, (err) => {
			if (last) {
				console.log('done');
				client.send_command('RANDOMKEY', redis.print);
				client.quit();
			}
			err && console.log(err)
			arr = [];
			cb(err);
		})

	} else {
		cb()
	}

});