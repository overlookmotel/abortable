/* --------------------
 * abortable module
 * `.finally()` prototype method
 * ------------------*/

'use strict';

// Imports
const {isPromise} = require('./utils');

// Exports

module.exports = function(handler) {
	return this.then(
		function(input) {
			const res = handler.call(this);
			// TODO Avoid extra tick where `res` is an Abortable
			if (isPromise(res)) return res.then(() => input);
			return input;
		},
		function(err) {
			const res = handler.call(this);
			// TODO Avoid extra tick where `res` is an Abortable
			if (isPromise(res)) return res.then(() => {throw err;});
			throw err;
		}
	);
};
