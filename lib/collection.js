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
	 * @param {boolean} [options.await] - If `true`, all Promises are awaited before returned Promise
	 *   resolves/rejects.
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
		// Extract all values from iterable and get `.then` properties of each
		const state = [],
			thenables = [];
		this.state = state;

		let nextIndex = 0;
		try {
			for (const value of iterable) {
				// Init item state
				const index = nextIndex++;
				state[index] = {status: PENDING, value};

				// Process item. Result resolves/rejects item in next microtick.
				// Record thenables for following in next microtick.
				const then = this.processItem(value, index, true);
				if (then) thenables.push({then, value, index});
			}

			// Exit synchronously if empty iterable
			if (nextIndex === 0) {
				this.resolved();
				return;
			}

			this.numPending = nextIndex;
		} catch (err) {
			// Iterator threw - reject synchronously, unless `await` option used and some pending thenables
			if (!this.awaitAll || thenables.length === 0) {
				this.reject(err);
			} else {
				this.status = REJECTED;
				this.result = err;
				this.numPending = nextIndex;
			}

			// Abort any pending.
			// Actual abort will happen in next microtick after `.then()` called on all thenables.
			this.abortPending();
		}

		// If no thenables, flag as processed
		if (thenables.length === 0) {
			this.isProcessed = true;
			return;
		}

		// Call `.then()` on thenables in next microtick
		nextMicrotick(() => {
			for (const thenable of thenables) {
				this.followThenable(thenable.value, thenable.then, thenable.index);
			}

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
	 * Process value.
	 * If is thenable, return `.then()` method. Otherwise, resolve item with value.
	 * If getting `.then` property throws error, reject item with thrown error.
	 * @param {*} value - Iterator item
	 * @param {number} index - Input index
	 * @param {boolean} delayByMicrotick - `true` if handling result should wait until next microtick
	 * @returns {Function|undefined} - `.then` property if is function, otherwise `undefined`
	 */
	processItem(value, index, delayByMicrotick) { // eslint-disable-line consistent-return
		try {
			// Get `.then()` method, if value has one
			const then = value ? getThenMethod(value) : null;

			// Thenable - return `.then()` method
			if (then) return then;

			// Not a thenable - resolve item with value
			this.resolveOrRejectItem(RESOLVED, value, index, delayByMicrotick);
		} catch (err) {
			// `.then` getter threw - reject item with thrown error
			this.resolveOrRejectItem(REJECTED, err, index, delayByMicrotick);
		}
	}

	/**
	 * Follow thenable.
	 * Call `.then()` on thenable and resolve/reject item dependent on callback.
	 * Ignore multiple calls to callbacks.
	 * @param {Object} value - Thenable
	 * @param {Function} then - `.then()` method
	 * @param {number} index - Input index
	 * @returns {undefined}
	 */
	followThenable(value, then, index) {
		// Call `.then()`.
		// Result is handled in next tick, even if `then()` calls callback synchronously.
		// For thenables (i.e. not native Promise), a microtick delay is always added.
		let delayByMicrotick = true,
			callbackNotCalledYet = true;
		const createCallback = fn => (res) => {
			if (callbackNotCalledYet) {
				callbackNotCalledYet = false;
				fn(res);
			}
		};

		const resolveCallback = createCallback((res) => {
			const then2 = this.processItem(res, index, delayByMicrotick);
			if (then2) nextMicrotick(() => this.followThenable(res, then2, index));
		});
		const rejectCallback = createCallback(
			err => this.resolveOrRejectItem(REJECTED, err, index, delayByMicrotick)
		);

		try {
			then.call(value, resolveCallback, rejectCallback);
			if (value instanceof Promise) delayByMicrotick = false;
		} catch (err) {
			rejectCallback(err);
		}
	}

	/**
	 * Item resolved/rejected.
	 * If `.then()` handler called synchronously, wait until next microtick to process result.
	 * @param {number} status - `RESOLVED` or `REJECTED`
	 * @param {*} value - Resolution value / rejection reason
	 * @param {number} index - Input position
	 * @param {boolean} delayByMicrotick - `true` if handling result should wait until next microtick
	 * @returns {undefined}
	 */
	resolveOrRejectItem(status, value, index, delayByMicrotick) {
		// Update item state
		const stateObj = this.state[index];
		stateObj.status = status;
		stateObj.value = value;

		// Run completion handler
		nowOrNextMicrotick(() => this.handleResolveOrRejectItem(status, value), delayByMicrotick);
	}

	/**
	 * Item is resolved/rejected.
	 * @param {number} status - Status of item
	 * @param {*} value - Resolution value / rejection reason
	 * @returns {undefined}
	 */
	handleResolveOrRejectItem(status, value) {
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
			if (!this.isAborted) this.abortPending();

			// If no `await` option, set `numPending` to 0 so will resolve/reject immediately
			if (!this.awaitAll) this.numPending = 0;
		}

		// If none remain pending, resolve or reject (resolution uses subclass method `.resolved()`)
		if (this.numPending === 0) {
			if (this.status === REJECTED) {
				this.reject(this.result);
			} else {
				this.resolved();
			}
		}
	}

	/**
	 * Abort all pending promises due to collection completion.
	 * @returns {undefined}
	 */
	abortPending() {
		// Prevent future calls to `promise.abort()` having any effect
		// TODO: Do other props need to be set on Promise?
		this.promise._canAbort = false;

		this.abort(new AbortError('Abort due to collection completion'));
	}

	/**
	 * Abort all pending promises.
	 * If `.then()` not called on thenables yet, record error.
	 * `.abortDo()` will be called after `.then()` has been called on thenables.
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
