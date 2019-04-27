/* --------------------
 * abortable module
 * DummyAbortable class
 * ------------------*/

'use strict';

// Imports
const methods = require('./methods');

// Exports

/*
 * DummyAbortable class
 * Is used in Abortable constructor as a substitute for Abortable before the real
 * Abortable is available in the constructor.
 * Registers `resolve()`, `reject()` or `onAbort()` being called inside Promise executor function.
 */
class DummyAbortable {
	/**
	 * @constructor
	 */
	constructor() {
		this._canAbort = true;
		this._isFateSealed = false;
		this._abortHandler = undefined;
		this._onAbortWasCalled = false;
		this._awaiting = undefined;
		this.isFollowing = false;
	}

	/**
	 * Abortable following an abortable.
	 * Record following.
	 * Same method as on Abortable, but simplified because dummy cannot be aborted.
	 * @param {Promise} target - Promise which is followed by this one
	 * @returns {undefined}
	 */
	_follow(target) {
		// Remove abort handler
		this._abortHandler = undefined;

		// Record awaiting
		this._awaiting = target;
	}

	/**
	 * `onAbort()` called with abort handler.
	 * Register abort handler if Promise can be aborted.
	 * Same method as on Abortable, but simplified because dummy cannot be aborted.
	 * @private
	 * @param {Function} fn - Abort handler
	 * @returns {undefined}
	 */
	_onAbort(fn) {
		if (typeof fn !== 'function') throw new TypeError('onAbort() must be passed a function');
		if (this._onAbortWasCalled) throw new Error('onAbort() cannot be called twice');
		this._onAbortWasCalled = true;

		// If resolve/reject already called, ignore this call
		if (this._isFateSealed) return;

		// Record abort handler
		this._abortHandler = fn;
	}

	/**
	 * Promise resolved.
	 * Clear state.
	 * Same method as on Abortable, but simplified because dummy cannot be aborted.
	 * @private
	 * @returns {undefined}
	 */
	_clear() {
		this._canAbort = false;
		this._abortHandler = undefined;
	}
}

// Add methods from Abortable
Object.assign(DummyAbortable.prototype, {
	_resolved: methods._resolved,
	_rejected: methods._rejected,
	_sealFate: methods._sealFate,
	_settled: methods._settled
});

module.exports = DummyAbortable;
