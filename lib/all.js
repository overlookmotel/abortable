/* --------------------
 * abortable module
 * `.all()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{REJECTED} = Collection;

// Exports

class CollectionAll extends Collection {
	resolveOrRejectCompletes(status) { // eslint-disable-line class-methods-use-this
		return status === REJECTED;
	}

	/**
	 * Resolve promise with array of results or reject with first error.
	 * @returns {undefined}
	 */
	done() {
		if (this.status === REJECTED) {
			this.reject(this.result);
		} else {
			this.resolve(this.arr);
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
	return new CollectionAll(options).run(iterable);
};
