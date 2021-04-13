/* --------------------
 * abortable module
 * `.any()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{RESOLVED} = Collection;

// Exports

const AggregateErr = createAggregateErrorClass();

class CollectionAny extends Collection {
	/**
	 * Completes on first resolution.
	 * @param {number} status - `RESOLVED` or `REJECTED`
	 * @returns {boolean}
	 */
	resolveOrRejectCompletes(status) { // eslint-disable-line class-methods-use-this
		return status === RESOLVED;
	}

	/**
	 * Resolve promise with first result or reject with first error.
	 * If no input promises, output Promise remains pending forever like `Promise.race()`.
	 * @returns {undefined}
	 */
	done() {
		if (this.status === RESOLVED) {
			this.resolve(this.result);
		} else {
			this.reject(new AggregateErr(
				this.state.map(s => s.value),
				'All promises were rejected'
			));
		}
	}
}

/**
 * Replacement `.any()` static method.
 * @param {Iterable} iterable - Array or other Iterable to consume Promises from
 * @param {Object} [options] - Options object
 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
 *   returned Promise resolves/rejects. If `false`, Promise resolves as soon as one
 *   input Promise resolves.
 * @returns {Abortable}
 */
module.exports = function(iterable, options) {
	return new CollectionAny(options).run(iterable);
};

/**
 * Create `AggregateError` class.
 * Use native class if exists, or create subclass of `Error` which imitates it.
 * @returns {Function} - `AggregateError` class
 */
function createAggregateErrorClass() {
	// Return native class if exists
	if (typeof AggregateError === 'function') return AggregateError; // eslint-disable-line no-undef

	// Create class
	const AggregateErr = class AggregateError extends Error { // eslint-disable-line no-shadow
		constructor(errors, message) {
			super(message);
			Object.defineProperty(this, 'errors', {
				value: errors,
				writable: true,
				configurable: true
			});
		}
	};

	Object.defineProperty(AggregateErr.prototype, 'name', {
		value: 'AggregateError',
		writable: true,
		configurable: true
	});

	return AggregateErr;
}
