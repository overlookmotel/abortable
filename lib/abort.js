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
	 * @param {Error} [err] - Optional error to abort with
	 * @param {boolean} [unilateral=false] - `true` to unilaterally abort
	 * @returns {Abortable} - This Promise for chaining
	 */
	abort(err, unilateral) {
		// Conform arguments
		if (typeof err === 'boolean') {
			unilateral = err;
			err = null;
		}

		// Validate arguments
		if (err != null && !(err instanceof Error)) throw new Error('.abort() error must be an Error or null');
		if (unilateral == null) {
			unilateral = false;
		} else if (typeof unilateral !== 'boolean') {
			throw new Error('.abort() unilateral argument must be true or false if provided');
		}

		// If cannot abort, exit
		if (!this._canAbort) return this;

		// If no error provided, create default error
		if (err == null) err = new AbortError();

		// Abort
		this._abort(err, unilateral);
		return this;
	},

	/**
	 * Abort Promise.
	 * @param {Error} err - Error to abort with
	 * @param {boolean} unilateral - `true` to unilaterally abort
	 * @returns {undefined}
	 */
	_abort(err, unilateral) {
		// Work out if consensus for abortion achieved
		if (unilateral) {
			this._abortError = err;
		} else {
			// If not already aborted by another follower/awaiter, record abort error
			if (!this._abortError) this._abortError = err;

			// Decrement unaborted followers/awaiters count
			this._unabortedCount--;

			// If not all followers/awaiters have requested abort, no abort yet
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
