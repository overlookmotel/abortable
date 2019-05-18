/* --------------------
 * abortable module
 * Abort methods.
 * To be merged into Abortable prototype.
 * ------------------*/

'use strict';

// Imports
const AbortError = require('./error');

// Exports

module.exports = {
	/**
	 * Abort Promise.
	 * @param {Error} [err] - Error to abort with (optional)
	 * @returns {Abortable} - This Promise for chaining
	 */
	abort(err) {
		// Validate arguments
		if (err != null && !(err instanceof Error)) {
			throw new Error('.abort() error must be an Error or null');
		}

		// If cannot abort, exit
		if (!this._canAbort) return this;

		// If no error provided, create default error
		if (err == null) err = new AbortError();

		// Abort
		this._abort(err);

		// Return this for chaining
		return this;
	},

	/**
	 * Abort Promise.
	 * @param {Error} err - Error to abort with
	 * @returns {undefined}
	 */
	_abort(err) {
		// TODO For debugging only - delete this
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
		const handler = this._abortHandler;
		this._abortHandler = undefined;

		handler(this._abortError);
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
