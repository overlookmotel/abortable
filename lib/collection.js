/* --------------------
 * abortable module
 * Collection class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./'),
	AbortError = require('./error'),
	{isPromise, isAbortable, once} = require('./utils');

// Constants
const PENDING = 'pending',
	RESOLVED = 'resolved',
	REJECTED = 'rejected';

// Exports

class Collection {
	constructor(iterator, options) {
		// Init
		if (!options) options = {};

		this.iterator = iterator;
		this.awaitAll = options.await;
		this.iterated = false;
		this.result = [];
		this.state = [];
		this.numPending = 0;
		this.errored = false;
		this.error = undefined;

		this.promise = new Abortable((resolve, reject, onAbort) => {
			this.resolve = resolve;
			this.reject = reject;
			onAbort((err, cb) => this.abort(err, cb));
		});
	}

	run() {
		// Iterate over iterator
		let index = 0;
		for (let item of this.iterator) {
			if (isPromise(item)) {
				this.numPending++;
				this.state[index] = PENDING;
				this.result[index] = item;

				item.then(
					res => this.resolvedOne(res, index), // jshint ignore:line
					err => this.rejectedOne(err, index) // jshint ignore:line
				);
			} else {
				this.resolvedOneSimple(item, index);
			}

			index++;
		}

		this.iterated = true;

		// If all resolved sync, resolve
		if (this.numPending == 0) this.done();

		// Return promise
		return this.promise;
	}

	resolvedOne(res, index) {
		this.resolvedOneSimple(res, index);

		this.numPending--;
		if (this.numPending == 0) this.done();
	}

	resolvedOneSimple(res, index) {
		this.result[index] = res;
		this.state[index] = RESOLVED;
	}

	rejectedOne(err, index) {
		this.result[index] = err;
		this.state[index] = REJECTED;

		if (!this.errored) {
			this.errored = true;
			this.error = err;

			if (this.awaitAll && err) {
				err.result = this.result;
				err.state = this.state;
			}

			// Abort all pending promises
			this._abort(new AbortError('Abort due to collection member rejection'), () => {});
		}

		this.numPending--;

		if (!this.awaitAll || this.numPending == 0) this.done();
	}

	abort(err, cb) {
		// Wrap callback to only be called once
		cb = once(cb);

		// Abort all unresolved promises
		this._abort(err, cb);
	}

	_abort(err, cb) {
		const {state, result} = this;
		for (let index = 0; index < state.length; index++) {
			if (state[index] == PENDING) {
				const p = result[index];
				if (isAbortable(p)) p._abortIndirect(err, cb);
			}
		}
	}
}

// Export constants
Collection.PENDING = PENDING;
Collection.RESOLVED = RESOLVED;
Collection.REJECTED = REJECTED;

// Export class
module.exports = Collection;
