/* --------------------
 * abortable module
 * Collection class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./'),
	AbortError = require('./error'),
	{isPromise, isAbortableInstance, isAbortableSimple, once} = require('./utils');

// Constants
const PENDING = 'pending',
	RESOLVED = 'resolved',
	REJECTED = 'rejected';

// Exports

class Collection {
	/**
	 * @constructor
	 * @param {Iterable} iterator - Array or other Iterable to consume Promises from
	 * @param {Object} [options] - Options object
	 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
	 *   returned Promise resolves/rejects. If `false`, Promise rejects as soon as one
	 *   input Promise rejects.
	 */
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
		this.aborted = false;

		this.promise = new Abortable((resolve, reject, onAbort) => {
			this.resolve = resolve;
			this.reject = reject;
			onAbort((err, cb) => this.abort(err, cb));
		});
	}

	/**
	 * Iterate over iterable and return Abortable.
	 * @returns {Abortable} - Abortable representing consolidated result of all input Promises
	 */
	run() {
		// Iterate over iterator
		let index = 0;
		for (const item of this.iterator) {
			if (item && isPromise(item)) {
				this.numPending++;
				this.state[index] = PENDING;
				this.result[index] = item;

				item.then(
					value => this.resolvedOne(value, index), // eslint-disable-line no-loop-func
					err => this.rejectedOne(err, index) // eslint-disable-line no-loop-func
				);
			} else {
				this.resolvedOneSimple(item, index);
			}

			index++;
		}

		this.iterated = true;

		// If all resolved sync, resolve
		if (this.numPending === 0) this.done();

		// Return promise
		return this.promise;
	}

	/**
	 * Input Promise resolved.
	 * If no Promises remain pending, resolve output Promise.
	 * @param {*} value - Resolution value
	 * @param {number} index - Input position
	 * @returns {undefined}
	 */
	resolvedOne(value, index) {
		this.resolvedOneSimple(value, index);

		this.numPending--;
		if (this.numPending === 0) this.done();
	}

	/**
	 * Input Promise resolved.
	 * Record result.
	 * @param {*} value - Resolution value
	 * @param {number} index - Input position
	 * @returns {undefined}
	 */
	resolvedOneSimple(value, index) {
		this.state[index] = RESOLVED;
		this.result[index] = value;
	}

	/**
	 * Input Promise rejected.
	 * If `await` option not set, or no Promises remain pending, output promise is rejected.
	 * @param {*} err - Rejection reason
	 * @param {number} index - Input position
	 * @returns {undefined}
	 */
	rejectedOne(err, index) {
		// Record result
		this.state[index] = REJECTED;
		this.result[index] = err;

		if (!this.errored) {
			// First error - record it
			this.errored = true;
			this.error = err;

			// If `await` option set, add `.state` and `.result` properties to error
			if (this.awaitAll && err) {
				err.result = this.result;
				err.state = this.state;
			}

			// Abort all pending promises
			if (!this.aborted) {
				this.promise._canAbort = false;
				this._abort(new AbortError('Abort due to collection member rejection'), () => {});
			}
		}

		// Decrement pending count
		this.numPending--;

		// If none remain pending or no `await` option, reject output Promise
		if (!this.awaitAll || this.numPending === 0) this.done();
	}

	/**
	 * Abort called.
	 * Abort all pending Promises.
	 * @param {Error} err - Abortion error.
	 * @param {Function} cb - Callback to be called when abort successful on at least
	 *   one Promise.
	 * @returns {undefined}
	 */
	abort(err, cb) {
		// Wrap callback to only be called once
		cb = once(cb);

		// Abort all pending promises
		this._abort(err, cb);
	}

	/**
	 * Abort all pending promises.
	 * @param {Error} err - Abortion error.
	 * @param {Function} cb - Callback to be called when abort successful.
	 *   May be called multiple times.
	 * @returns {undefined}
	 */
	_abort(err, cb) {
		this.aborted = true;

		const {state, result} = this;
		for (let index = 0; index < state.length; index++) {
			if (state[index] === PENDING) {
				const p = result[index];
				if (isAbortableInstance(p)) {
					if (p._canAbort) p._abort(err, cb);
				} else if (isAbortableSimple(p)) {
					p.abort(err, cb);
				}
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
