/* --------------------
 * abortable module
 * `.finally()` prototype method
 * ------------------*/

'use strict';

// Imports
const {isPromise} = require('./utils');

// Exports

/**
 * Replacement `.finally()` prototype method (or polyfill where no existing method).
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
