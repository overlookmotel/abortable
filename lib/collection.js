/* --------------------
 * abortable module
 * Collection class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js'),
	AbortError = require('./error.js'),
	{getThenMethod, getAbortMethod, isAbortableInstance} = require('./utils.js');

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
		this.result = [];
		this.state = [];
		this.numPending = 1;
		this.exited = false;
		this.errored = false;
		this.error = undefined;
		this.aborted = false;

		this.promise = new Abortable((resolve, reject, onAbort) => {
			this.resolve = resolve;
			this.reject = reject;
			onAbort(err => this.abort(err));
		});
	}

	/**
	 * Iterate over iterable and return Abortable.
	 * @returns {Abortable} - Abortable representing consolidated result of all input Promises
	 */
	run() {
		try {
			// Iterate over iterator
			let i = 0;
			for (const item of this.iterator) {
				const index = i;
				this.numPending++;
				this.state[index] = PENDING;
				this.result[index] = item;

				try {
					const then = item ? getThenMethod(item) : null;
					if (then) {
						then.call(
							item,
							value => this.resolvedOne(value, index),
							err => this.rejectedOne(err, index)
						);
					} else {
						this.resolvedOne(item, index);
					}
				} catch (err) {
					this.rejectedOne(err, index);
				}

				i++;
			}

			// If all resolved sync, resolve
			this.numPending--;
			if (!this.exited && this.numPending === 0) this.exit();
		} catch (err) {
			// Error iterating (e.g. iterator is undefined)
			this.exited = true;
			this.reject(err);
		}

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
		if (this.exited) return;
		this.resolvedOneDo(value, index);

		this.numPending--;
		if (this.numPending === 0) this.exit();
	}

	/**
	 * Input Promise resolved.
	 * Record result.
	 * @param {*} value - Resolution value
	 * @param {number} index - Input position
	 * @returns {undefined}
	 */
	resolvedOneDo(value, index) {
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
		if (this.exited) return;
		this.rejectedOneDo(err, index);
	}

	rejectedOneDo(err, index) {
		// Record result
		this.state[index] = REJECTED;
		this.result[index] = err;

		if (!this.errored) {
			// First error - record it
			this.errored = true;
			this.error = err;

			// Abort all pending promises
			this.abortPending();
		}

		// Decrement pending count
		this.numPending--;

		// If none remain pending or no `await` option, reject output Promise
		if (!this.awaitAll || this.numPending === 0) this.exit();
	}

	/**
	 * Abort all pending promises.
	 * @return {undefined}
	 */
	abortPending() {
		if (!this.aborted) {
			// Prevent any future calls to `promise.abort()` having any effect
			this.promise._canAbort = false;

			// Abort pending promises
			this.abort(new AbortError('Abort due to collection completion'));
		}
	}

	/**
	 * Abort all pending promises.
	 * @param {Error} err - Abortion error.
	 * @returns {undefined}
	 */
	abort(err) {
		this.aborted = true;

		const {state, result} = this;
		for (let index = 0; index < state.length; index++) {
			if (state[index] === PENDING) {
				const p = result[index];
				if (isAbortableInstance(p)) {
					if (p._canAbort) p._abort(err);
				} else {
					const abort = getAbortMethod(p);
					if (abort) abort.call(p, err);
				}
			}
		}
	}

	/**
	 * Exit - i.e. resolve or reject.
	 * Call `.done()` method which is defined on subclasses.
	 * @returns {undefined}
	 */
	exit() {
		this.exited = true;
		this.done();
	}
}

// Export constants
Collection.PENDING = PENDING;
Collection.RESOLVED = RESOLVED;
Collection.REJECTED = REJECTED;

// Export class
module.exports = Collection;
