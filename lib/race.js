/* --------------------
 * abortable module
 * `.race()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{RESOLVED, REJECTED} = Collection;

// Exports

class CollectionRace extends Collection {
	resolveOrRejectCompletes() { // eslint-disable-line class-methods-use-this
		return true;
	}

	/**
	 * Resolve promise with first result or reject with first error.
	 * If no input promises, output Promise remains pending forever like `Promise.race()`.
	 * @returns {undefined}
	 */
	done() {
		const {status} = this;
		if (status === RESOLVED) {
			this.resolve(this.result);
		} else if (status === REJECTED) {
			this.reject(this.result);
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
