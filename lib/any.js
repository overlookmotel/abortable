/* --------------------
 * abortable module
 * `.any()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{PENDING, RESOLVED, REJECTED} = Collection;

// Exports

const AggregateErr = createAggregateErrorClass();

class CollectionAny extends Collection {
	constructor(options) {
		super(options);

		this.anyState = PENDING;
		this.anyResult = undefined;
	}

	resolvedOneDo(value, index) {
		const isPending = this.anyState === PENDING;
		if (isPending) {
			this.anyState = RESOLVED;
			this.anyResult = value;

			// If no `await` option, set `numPending` to 1 so will resolve immediately
			if (!this.awaitAll) this.numPending = 1;
		}

		super.resolvedOneDo(value, index);

		// Abort all pending promises
		if (isPending) this.abortPending();
	}

	rejectedOneDo(err, index) {
		// Record result
		this.state[index] = REJECTED;
		this.result[index] = err;

		// Decrement pending count
		this.numPending--;

		// If all Promises rejected, reject output Promise
		if (this.numPending === 0) this.exit();
	}

	/**
	 * Resolve promise with first result or reject with first error.
	 * If no input promises, output Promise remains pending forever like `Promise.race()`.
	 * @returns {undefined}
	 */
	done() {
		if (this.anyState === RESOLVED) {
			this.resolve(this.anyResult);
		} else {
			this.reject(new AggregateErr(this.result, 'All promises were rejected'));
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
