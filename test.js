'use strict';

let resolve, reject;
const p = new Promise((_resolve, _reject) => {
	resolve = _resolve;
	reject = _reject;
});

//debug('p', p);
//resolve({a: 123});
//reject(new Error('oops'));
//debug('p', p);

const p2 = Promise.all([123]);
debug('p2', p2);

setTimeout(() => {
	//resolve(123);
	//debug('p', p);
	debug('p2', p2);

	setTimeout(() => {
		debug('p2', p2);
	}, 100);
}, 100);


function debug(name, p) {
	console.log(`${name}:`, p);

	const props = Object.getOwnPropertyNames(p);

	for (let key of props) {
		console.log(`${name}.${key}:`, p[key]);
	}

	const symbols = Object.getOwnPropertySymbols(p);

	for (let key of symbols) {
		console.log(`${name}.${key}:`, p[key]);
	}
}
