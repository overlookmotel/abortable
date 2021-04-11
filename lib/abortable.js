/* --------------------
 * abortable module
 * Abortable class
 * ------------------*/

'use strict';

// Imports
// Is imported below class definition to avoid circular references with utils.js
// TODO Work out better way to do this
let DummyAbortable;

// Exports

const passthroughResolveHandler = value => value,
	passthroughRejectHandler = (err) => { throw err; };

class Abortable extends Promise {
	/**
	 * @constructor
	 * @param {Function} executor - Executor function. Called with args `(resolve, reject, onAbort)`.
	 */
	constructor(executor) {
		// If invalid executor, pass to Promise constructor which will throw error
		if (typeof executor !== 'function') {
			super(executor);
			throw new TypeError('Promise resolver is not a function');
		}

		// Create dummy abortable object to catch events before `this` is available
		let p = new DummyAbortable();

		// Create Abortable, passing extra arg `onAbort` to executor function
		super(function(resolve, reject) {
			/* eslint-disable no-invalid-this */
			return executor.call(
				this,
				function(value) { return p._resolved(resolve, value, this); },
				function(err) { return p._rejected(reject, err, this); },
				abortHandler => p._onAbort(abortHandler)
			);
			/* eslint-enable no-invalid-this */
		});

		// Init Abortable and transfer state from dummy
		const awaiting = p._awaiting;

		this._canAbort = p._canAbort;
		this._isFateSealed = p._isFateSealed;
		this._abortHandler = p._abortHandler;
		this._onAbortWasCalled = p._onAbortWasCalled;
		this._awaiting = awaiting;
		this._followers = undefined;
		this._isAborted = false;
		this._abortError = undefined;
		this._unabortedCount = 0;
		this._expectingInternalThen = false;

		this._debugInit(p);

		// If following, record following
		if (awaiting) awaiting._followedRecordFollower(this);

		p = this;
	}

	/**
	 * Replacement `.then()` method.
	 * Chain a new Promise on this Promise.
	 * @param {Function} [resolveHandler] - Handler for when Promise resolved
	 * @param {Function} [rejectHandler] - Handler for when Promise rejected
	 * @returns {Abortable} - New chained Promise
	 */
	then(resolveHandler, rejectHandler) {
		this._debug('then', `(_expectingInternalThen: ${this._expectingInternalThen})`);

		// If `.then()` is being called by native Promise implementation, pass it through
		// without modification - don't record following.
		// See comments in `._followed()` method for more details.
		if (this._expectingInternalThen) {
			this._expectingInternalThen = false;
			return super.then(resolveHandler, rejectHandler);
		}

		// Call native Promise `.then()` method
		if (typeof resolveHandler !== 'function') resolveHandler = passthroughResolveHandler;
		if (typeof rejectHandler !== 'function') rejectHandler = passthroughRejectHandler;

		/* eslint-disable no-invalid-this */
		const p = super.then(
			function(value) { return p._handled(resolveHandler, value, this); },
			function(err) { return p._handled(rejectHandler, err, this); }
		);
		/* eslint-enable no-invalid-this */

		// Increment unaborted followers/awaiters count
		this._unabortedCount++;
		this._debug('then created promise', `(new promise ${this._debugName(p)}) (_unabortedCount: ${this._unabortedCount})`);

		// Set chained Promise to await this Promise
		if (this._canAbort) p._awaiting = this;

		// Return new Promise
		return p;
	}
}

module.exports = Abortable;

// Import DummyAbortable
DummyAbortable = require('./dummy.js');
