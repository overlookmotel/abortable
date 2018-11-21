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
		this.raceResult = null;
	}

	resolvedOneSimple(res, index) {
		if (this.raceState == PENDING) {
			this.raceState = RESOLVED;
			this.raceResult = res;
		}

		super.resolvedOneSimple(res, index);
	}

	rejectedOne(err, index) {
		if (this.raceState == PENDING) {
			this.raceState = REJECTED;
			this.raceResult = err;
		}

		super.rejectedOne(err, index);
	}

	done() {
		if (this.raceState == REJECTED) return this.reject(this.raceResult);
		if (this.raceState == RESOLVED) this.resolve(this.raceResult);
	}
}

module.exports = function(iterator, options) {
	return new CollectionRace(iterator, options).run();
};
