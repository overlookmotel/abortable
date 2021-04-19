/* --------------------
 * abortable module
 * `.race()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{RESOLVED} = Collection;

// Exports

class CollectionRace extends Collection {
	/**
	 * Completes on first resolution or rejection.
	 * @returns {boolean}
	 */
	resolveOrRejectCompletes() { // eslint-disable-line class-methods-use-this
		return true;
	}

	/**
	 * Resolve promise with first result or reject with first error.
	 * @returns {undefined}
	 */
	resolved() {
		if (this.status === RESOLVED) {
			this.resolve(this.result);
		} else {
			// No input promises - output Promise remains pending forever like `Promise.race()`.
			// Flag promise as not abortable.
			this.promise._canAbort = false;
		}
	}
}

/**
 * Replacement `.race()` static method.
 * @param {Iterable} iterable - Array or other Iterable to consume Promises from
 * @param {Object} [options] - Options object
 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
 *   returned Promise resolves/rejects. If `false`, Promise rejects as soon as one
 *   input Promise rejects.
 * @returns {Abortable}
 */
module.exports = function(iterable, options) {
	return new CollectionRace(options).run(iterable);
};
