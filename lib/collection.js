/* --------------------
 * abortable module
 * Collection class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js'),
	AbortError = require('./error.js'),
	{
		getThenMethod, getAbortMethod, isAbortableInstance, nextMicrotick, nowOrNextMicrotick
	} = require('./utils.js');

// Constants
const PENDING = 0,
	RESOLVED = 1,
	REJECTED = 2;

// Exports

class Collection {
	/**
	 * @constructor
	 * @param {Object} [options] - Options object
	 * @param {boolean} [options.await] - If `true`, all Promises are awaited before
	 *   returned Promise resolves/rejects. If `false`, Promise rejects as soon as one
	 *   input Promise rejects.
	 */
	constructor(options) {
		this.awaitAll = options ? !!options.await : false;
		this.status = PENDING;
		this.result = undefined;
		this.state = undefined;
		this.numPending = 0;
		this.isProcessed = false;
		this.isAborted = false;
		this.abortError = undefined;

		this.promise = new Abortable((resolve, reject, onAbort) => {
			this.resolve = resolve;
			this.reject = reject;
			onAbort(err => this.abort(err));
		});
	}

	/**
	 * Iterate over iterable and return Abortable.
	 * @param {Iterable} iterable - Array or other Iterable to consume Promises from
	 * @returns {Abortable} - Abortable representing consolidated result of all input Promises
	 */
	run(iterable) {
		this.runDo(iterable);
		return this.promise;
	}

	runDo(iterable) {
		// Extract all values from iterable.
		// Synchronously reject if error whie iterating (e.g. iterable is undefined).
		let arr;
		try {
			arr = [...iterable];
		} catch (err) {
			this.reject(err);
			return;
		}

		// Init state
		this.state = arr.map(item => ({status: PENDING, value: item}));
		this.numPending = arr.length;

		// Exit synchronously if empty array
		if (arr.length === 0) {
			this.done();
			return;
		}

		// Process input in next microtick
		nextMicrotick(() => {
			arr.forEach((item, index) => {
				// Get `.then` method.
				// Error from getter causes sync rejection of output promise.
				let then;
				try {
					then = item ? getThenMethod(item) : null;
				} catch (err) {
					this.resolvedOrRejectedOne(REJECTED, err, index, false);
					return;
				}

				if (then) {
					// Call `.then()`. Result is handled in next tick.
					try {
						let isSync = true;
						then.call(
							item,
							value => this.resolvedOrRejectedOneFromThen(RESOLVED, value, index, isSync),
							err => this.resolvedOrRejectedOneFromThen(REJECTED, err, index, isSync)
						);
						isSync = false;
					} catch (err) {
						this.resolvedOrRejectedOneFromThen(REJECTED, err, index, true);
					}
				} else {
					// Not a promise - resolve synchronously
					this.resolvedOrRejectedOne(RESOLVED, item, index, false);
				}
			});

			// Flag as processed
			this.isProcessed = true;

			// If was aborted before processing complete, abort now
			if (this.isAborted) {
				const err = this.abortError;
				this.abortError = undefined;
				this.abortDo(err);
			}
		});
	}

	/**
	 * Input Promise resolved/rejected from `.then()` handler.
	 * Ignore multiple callbacks.
	 * If `.then()` handler called synchronously, wait until next microtick to process result.
	 * @param {number} status - `RESOLVED` or `REJECTED`
	 * @param {*} value - Resolution value / rejection reason
	 * @param {number} index - Input position
	 * @param {boolean} isSync - `true` if `.then()` callback called synchronously
	 * @returns {undefined}
	 */
	resolvedOrRejectedOneFromThen(status, value, index, isSync) {
		if (this.state[index].status !== PENDING) return;
		this.resolvedOrRejectedOne(status, value, index, isSync);
	}

	/**
	 * Input Promise resolved/rejected.
	 * If `.then()` handler called synchronously, wait until next microtick to process result.
	 * @param {number} status - `RESOLVED` or `REJECTED`
	 * @param {*} value - Resolution value / rejection reason
	 * @param {number} index - Input position
	 * @param {boolean} delayByMicrotick - `true` if handling result should wait until next microtick
	 * @returns {undefined}
	 */
	resolvedOrRejectedOne(status, value, index, delayByMicrotick) {
		// Update item state
		const stateObj = this.state[index];
		stateObj.status = status;
		stateObj.value = value;

		// Run completion handler
		nowOrNextMicrotick(() => this.handleOne(status, value), delayByMicrotick);
	}

	/**
	 * Item is resolved/rejected.
	 * @param {number} status - Status of item
	 * @param {*} value - Resolution value / rejection reason
	 * @returns {undefined}
	 */
	handleOne(status, value) {
		// If output Abortable already resolved/rejected, ignore this result
		if (this.numPending === 0) return;

		// Decrement pending count
		this.numPending--;

		// If this determines the final outcome, record result, and abort all pending promises.
		// `.resolveOrRejectCompletes()` is defined by Collection subclasses.
		if (this.status === PENDING && this.resolveOrRejectCompletes(status)) {
			// Record result
			this.status = status;
			this.result = value;

			// Abort all pending promises
			if (!this.isAborted) {
				// Prevent any future calls to `promise.abort()` having any effect
				this.promise._canAbort = false;
				this.abort(new AbortError('Abort due to collection completion'));
			}

			// If no `await` option, set `numPending` to 0 so will exit immediately
			if (!this.awaitAll) this.numPending = 0;
		}

		// If none remain pending, exit
		if (this.numPending === 0) this.done();
	}

	/**
	 * Abort all pending promises.
	 * If input has not yet been processed, record error. `.abortDo()` will be called once processed.
	 * @param {Error} err - Abort error.
	 * @returns {undefined}
	 */
	abort(err) {
		this.isAborted = true;

		if (this.isProcessed) {
			this.abortDo(err);
		} else {
			this.abortError = err;
		}
	}

	/**
	 * Abort all pending promises.
	 * @param {Error} err - Abort error.
	 * @returns {undefined}
	 */
	abortDo(err) {
		for (const {status, value} of this.state) {
			if (status === PENDING) {
				if (isAbortableInstance(value)) {
					if (value._canAbort) value._abort(err);
				} else {
					const abort = getAbortMethod(value);
					if (abort) abort.call(value, err);
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
