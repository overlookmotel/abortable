/* --------------------
 * abortable module
 * `.race()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection.js'),
	{PENDING, RESOLVED, REJECTED} = Collection;

// Exports

class CollectionRace extends Collection {
	constructor(iterable, options) {
		super(iterable, options);

		this.raceState = PENDING;
		this.raceResult = undefined;
	}

	resolvedOneDo(value, index) {
		const isPending = this.raceState === PENDING;
		if (isPending) {
			this.raceState = RESOLVED;
			this.raceResult = value;

			// If no `await` option, set `numPending` to 1 so will resolve immediately
			if (!this.awaitAll) this.numPending = 1;
		}

		super.resolvedOneDo(value, index);

		// Abort all pending promises
		if (isPending) this.abortPending();
	}

	rejectedOneDo(err, index) {
		if (this.raceState === PENDING) {
			this.raceState = REJECTED;
			this.raceResult = err;
		}

		super.rejectedOneDo(err, index);
	}

	/**
	 * Resolve promise with first result or reject with first error.
	 * If no input promises, output Promise remains pending forever like `Promise.race()`.
	 * @returns {undefined}
	 */
	done() {
		const {raceState} = this;
		if (raceState === RESOLVED) {
			this.resolve(this.raceResult);
		} else if (raceState === REJECTED) {
			this.reject(this.raceResult);
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
	return new CollectionRace(iterable, options).run();
};
