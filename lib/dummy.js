/* --------------------
 * abortable module
 * DummyAbortable class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./'),
	{isAbortable} = require('./utils');

// Exports

/**
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
		this._isAbortable = true;
		this._isFateSealed = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followerIndex = undefined;
	}

	/**
	 * Executor resolve callback called.
	 * If resolve callback called with an Abortable, follow it and record index in followers
	 * array the dummy is recorded in, so real Abortable can be substituted later.
	 * If resolve / reject callback has already been called, this later call is ignored.
	 * @private
	 * @param {Function} resolve - Resolve callback
	 * @param {*} res - Value passed to resolve callback
	 * @param {*} ctx - `this` context resolve callback called on
	 * @returns {*} - Return value of native resolve callback
	 */
	_resolved(resolve, res, ctx) {
		if (this._sealFate()) {
			if (isAbortable(res)) {
				// Promise follows resolution value
				this._followerIndex = res._followed(this) - 1;
			} else {
				// Promise resolved
				this._clear();
			}
		}

		return resolve.call(ctx, res);
	}

	/**
	 * Executor reject callback called.
	 * If resolve / reject callback has already been called, this later call is ignored.
	 * @private
	 * @param {Function} reject - Reject callback
	 * @param {*} err - Value passed to reject callback
	 * @param {*} ctx - `this` context reject callback called on
	 * @returns {*} - Return value of native reject callback
	 */
	_rejected(reject, err, ctx) {
		if (this._sealFate()) this.clear();

		return reject.call(ctx, err);
	}

	/**
	 * `onAbort()` called with abort handler.
	 * Register abort handler if Promise can be aborted.
	 * @private
	 * @param {Function} fn - Abort handler
	 * @returns {undefined}
	 */
	_onAbort(fn) {
		if (this._isAbortable) this._abortHandler = fn;
	}

	/**
	 * Promise resolved.
	 * Clear state.
	 * @private
	 * @returns {undefined}
	 */
	_clear() {
		this._isAbortable = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followerIndex = undefined;
	}
}

// Copy `._sealFate()` method from Abortable
DummyAbortable.prototype._sealFate = Abortable.prototype._sealFate;

module.exports = DummyAbortable;
