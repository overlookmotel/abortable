/* --------------------
 * abortable module
 * Abort methods.
 * To be merged into Abortable prototype.
 * ------------------*/

'use strict';

// Modules
const assert = require('simple-invariant');

// Imports
const AbortError = require('./error.js');

// Exports

module.exports = {
	/**
	 * Abort Promise.
	 * @param {Error} [err] - Error to abort with (optional)
	 * @returns {Abortable} - This Promise for chaining
	 */
	abort(err) {
		// Validate arguments
		assert(err == null || err instanceof Error, '.abort() error must be an Error or null/undefined');

		// Abort, if can be aborted (if no error provided, create default error)
		if (this._canAbort) this._abort(err || new AbortError());

		// Return this for chaining
		return this;
	},

	/**
	 * Abort Promise.
	 * @param {Error} err - Error to abort with
	 * @returns {undefined}
	 */
	_abort(err) {
		this._debug('_abort');

		// If not already aborted by another follower/awaiter, record abort error
		if (!this._abortError) this._abortError = err;

		// Exit if not unanimous desire for abortion yet
		// e.g. `.then()` has been called more times than `.abort()`
		if (this._unabortedCount > 0) {
			this._unabortedCount--;
			if (this._unabortedCount > 0) return;
		}

		// Set flags
		this._isAborted = true;
		this._canAbort = false;

		// Abort
		const awaiting = this._awaiting;
		if (awaiting) {
			this._awaiting = undefined;

			// Propagate abortion to next promise up chain
			this._abortPropagate(awaiting);
		} else if (this._abortHandler) {
			this._abortDo();
		}
	},

	/**
	 * Abort this Promise directly by calling abort handler.
	 * @private
	 * @returns {undefined}
	 */
	_abortDo() {
		const abortHandler = this._abortHandler;
		this._abortHandler = undefined;
		abortHandler(this._abortError);
	},

	/**
	 * Propagate abortion to another Abortable.
	 * @private
	 * @param {Abortable} target - Promise to propagate to
	 * @returns {undefined}
	 */
	_abortPropagate(target) {
		const err = this._abortError;
		delete this._abortError;
		target._abort(err);
	}
};
