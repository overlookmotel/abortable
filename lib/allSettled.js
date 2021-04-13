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
	/**
	 * Resolve promise with array of result objects.
	 * @returns {undefined}
	 */
	done() {
		const {result} = this;
		this.resolve(this.state.map((status, index) => (
			status === RESOLVED
				? {status: 'fulfilled', value: result[index]}
				: {status: 'rejected', reason: result[index]}
		)));
	}
}

/**
 * Replacement `.allSettled()` static method.
 * @param {Iterable} iterable - Array or other Iterable to consume Promises from
 * @returns {Abortable}
 */
module.exports = function(iterable) {
	return new CollectionAllSettled({await: true}).run(iterable);
};
