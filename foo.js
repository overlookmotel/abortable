/* eslint-disable no-console */

'use strict';

const Abortable = require('./index.js');

let resolve;
const p = Abortable.all([{
	then(_resolve) {
		resolve = _resolve;
	}
}]);

(async () => {
	await Promise.resolve();

	let thenGetterCalled = false;
	let thenCalled = false;
	resolve({
		get then() {
			thenGetterCalled = true;
			return (r) => {
				thenCalled = true;
				r(123);
			};
		}
	});

	console.log('thenGetterCalled sync:', thenGetterCalled);
	console.log('thenCalled sync:', thenCalled);

	await Promise.resolve().then(() => {
		console.log('thenCalled after one microtick:', thenCalled);
	});

	const res = await p;
	console.log('res:', res);
})();
