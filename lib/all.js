/* --------------------
 * abortable module
 * `.all()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection');

// Exports

class CollectionAll extends Collection {
	/**
	 * Resolve promise with array of results or reject with first error.
	 * @returns {undefined}
	 */
	done() {
		if (this.errored) return this.reject(this.error);
		this.resolve(this.result);
	}
}

/**
 * Replacement `.all()` static method.
 * @param {Iterable} iterator - Array or other Iterable to consume Promises from
 * @param {Object} [options] - Options object
 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
 *   returned Promise resolves/rejects. If `false`, Promise rejects as soon as one
 *   input Promise rejects.
 */
module.exports = function(iterator, options) {
	return new CollectionAll(iterator, options).run();
};
