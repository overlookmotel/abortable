/* --------------------
 * abortable module
 * `.race()` static method
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection'),
	{PENDING, RESOLVED, REJECTED} = Collection;

// Exports

class CollectionRace extends Collection {
	constructor(iterator, options) {
		super(iterator, options);

		this.raceState = PENDING;
		this.raceResult = undefined;
	}

	resolvedOneDo(value, index) {
		if (this.raceState === PENDING) {
			this.raceState = RESOLVED;
			this.raceResult = value;
		}

		super.resolvedOneDo(value, index);
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
 * @param {Iterable} iterator - Array or other Iterable to consume Promises from
 * @param {Object} [options] - Options object
 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
 *   returned Promise resolves/rejects. If `false`, Promise rejects as soon as one
 *   input Promise rejects.
 */
module.exports = function(iterator, options) {
	return new CollectionRace(iterator, options).run();
};
