/* --------------------
 * abortable module
 * `.all()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js');

// Exports

class CollectionAll extends Collection {
	/**
	 * Resolve promise with array of results or reject with first error.
	 * @returns {undefined}
	 */
	done() {
		if (this.errored) {
			this.reject(this.error);
		} else {
			this.resolve(this.result);
		}
	}
}

/**
 * Replacement `.all()` static method.
 * @param {Iterable} iterable - Array or other Iterable to consume Promises from
 * @param {Object} [options] - Options object
 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
 *   returned Promise resolves/rejects. If `false`, Promise rejects as soon as one
 *   input Promise rejects.
 * @returns {Abortable}
 */
module.exports = function(iterable, options) {
	return new CollectionAll(iterable, options).run();
};
