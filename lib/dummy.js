/* --------------------
 * abortable module
 * DummyAbortable class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./'),
	{isAbortable, isAbortableInstance} = require('./utils');

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
		this._awaiting = undefined;
	}

	/**
	 * Executor resolve callback called.
	 * If resolve callback called with an Abortable, follow it and record index in followers
	 * array the dummy is recorded in, so real Abortable can be substituted later.
	 * If resolve / reject callback has already been called, this later call is ignored.
	 * @private
	 * @param {Function} resolve - Resolve callback
	 * @param {*} value - Value passed to resolve callback
	 * @param {*} ctx - `this` context resolve callback called on
	 * @returns {*} - Return value of native resolve callback
	 */
	_resolved(resolve, value, ctx) {
		if (this._sealFate()) value = this._settled(value);
		return resolve.call(ctx, value);
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
		if (this._sealFate()) this._clear();

		return reject.call(ctx, err);
	}

	/**
	 * Flag as fate sealed (i.e. resolve or reject callback called).
	 * @private
	 * @returns {boolean} - `true` if this call sealed fate, `false` if fate is already sealed
	 */
	_sealFate() {
		if (this._isFateSealed) return false;
		this._isFateSealed = true;
		return true;
	}

	/**
	 * Promise resolved with value.
	 * If resolved with an abortable, follow it.
	 * @private
	 * @param {*} value - Value promise resolved with
	 * @returns {*} - Wrapped resolution value
	 */
	_settled(value) {
		if (value) {
			if (isAbortableInstance(value)) {
				// Is an instance of Abortable class
				if (value.canAbort()) {
					// Promise follows resolution value
					this._awaiting = value;

					return value;
				}
			} else if (isAbortable(value)) {
				// Is an abortable object (but not an Abortable from this module)
				// Wrap resolution value and await it

				// TODO This is wrong - will lead to infinite recursion
				const p = new Abortable(resolve => resolve(value));
				this._awaiting = p;
				return p;
			}
		}

		// Not followable
		this._clear();
		return value;
	}

	/**
	 * `onAbort()` called with abort handler.
	 * Register abort handler if Promise can be aborted.
	 * @private
	 * @param {Function} fn - Abort handler
	 * @returns {undefined}
	 */
	_onAbort(fn) {
		if (this._canAbort) this._abortHandler = fn;
	}

	/**
	 * Promise resolved.
	 * Clear state.
	 * @private
	 * @returns {undefined}
	 */
	_clear() {
		this._canAbort = false;
		this._abortHandler = undefined;
	}
}

module.exports = DummyAbortable;
