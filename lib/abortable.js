/* --------------------
 * abortable module
 * Abortable class
 * ------------------*/

'use strict';

// Imports
let DummyAbortable;

// Exports

class Abortable extends Promise {
	/**
	 * @constructor
	 * @param {Function} executor - Executor function.
	 *   Called with args `(resolve, reject, onAbort)`.
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
			return executor.call(
				// eslint-disable-next-line no-invalid-this
				this,
				// eslint-disable-next-line no-invalid-this
				function(value) { return p._resolved(resolve, value, this); },
				// eslint-disable-next-line no-invalid-this
				function(err) { return p._rejected(reject, err, this); },
				fn => p._onAbort(fn)
			);
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

		// If following, record following
		if (p.isFollowing) awaiting._followed(this);

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
		// Call native Promise `.then()` method
		// TODO Optimise for missing handlers
		if (typeof resolveHandler !== 'function') resolveHandler = value => value;
		if (typeof rejectHandler !== 'function') rejectHandler = (err) => { throw err; };

		const p = super.then(
			// eslint-disable-next-line no-invalid-this
			function(value) { return p._handled(resolveHandler, value, this); },
			// eslint-disable-next-line no-invalid-this
			function(err) { return p._handled(rejectHandler, err, this); }
		);

		// Increment unaborted followers/awaiters count
		this._unabortedCount++;

		// Set chained Promise to await this Promise
		if (this._canAbort) p._awaiting = this;

		// Return new Promise
		return p;
	}
}

module.exports = Abortable;

// Import DummyAbortable here to avoid circular references with utils.js
// TODO Work out better way to do this
DummyAbortable = require('./dummy');
