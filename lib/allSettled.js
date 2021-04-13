/* --------------------
 * abortable module
 * `.allSettled()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{RESOLVED} = Collection;

// Exports

class CollectionAllSettled extends Collection {
	resolveOrRejectCompletes() { // eslint-disable-line class-methods-use-this
		return false;
	}

	/**
	 * Resolve promise with array of result objects.
	 * @returns {undefined}
	 */
	done() {
		this.resolve(this.state.map(({status, value}) => (
			status === RESOLVED
				? {status: 'fulfilled', value}
				: {status: 'rejected', reason: value}
		)));
	}
}

/**
 * Replacement `.allSettled()` static method.
 * @param {Iterable} iterable - Array or other Iterable to consume Promises from
 * @returns {Abortable}
 */
module.exports = function(iterable) {
	return new CollectionAllSettled().run(iterable);
};
