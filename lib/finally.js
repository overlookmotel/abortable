/* --------------------
 * abortable module
 * Polyfill `.finally()` prototype method
 * ------------------*/

'use strict';

// Imports
const {isPromise} = require('./utils');

// Exports

/**
 * Polyfill `.finally()` prototype method for Node 8.
 * (Node 10+ has method natively)
 * @param {Function} handler - Handler to be called when promise resolves/rejects
 * @returns {Abortable}
 */
module.exports = function(handler) {
	if (typeof handler !== 'function') return this.then(handler, handler);

	return this.then(
		function(input) {
			const res = handler.call(this); // eslint-disable-line no-invalid-this
			// TODO Avoid extra tick where `res` is an Abortable
			if (res && isPromise(res)) return res.then(() => input);
			return input;
		},
		function(err) {
			// NB If handler throws or returns promise which rejects, promise returned
			// from `.finally()` rejects with handler's error *not* original error,
			// as per `Promise.prototype.finally()`.
			const res = handler.call(this); // eslint-disable-line no-invalid-this
			// TODO Avoid extra tick where `res` is an Abortable
			if (res && isPromise(res)) return res.then(() => { throw err; });
			throw err;
		}
	);
};
