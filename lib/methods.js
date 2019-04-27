/* --------------------
 * abortable module
 * Abortable class prototype methods to be merged into Abortable
 * ------------------*/

'use strict';

// Imports
const AbortError = require('./error'),
	{toAbortable, pushOrCreate} = require('./utils');

// Exports

module.exports = {
	/**
	 * Executor resolve callback called.
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
	},

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
	},

	/**
	 * Flag as fate sealed (i.e. resolve or reject callback called).
	 * @private
	 * @returns {boolean} - `true` if this call sealed fate, `false` if fate is already sealed
	 */
	_sealFate() {
		if (this._isFateSealed) return false;
		this._isFateSealed = true;
		return true;
	},

	/**
	 * Promise resolved with value.
	 * If resolved with an abortable, follow it.
	 * Propagate abortion if this Promise is aborted.
	 * @private
	 * @param {*} value - Value promise resolved with
	 * @returns {*} - Wrapped resolution value
	 */
	_settled(value) {
		// Follow result if abortable
		const p = toAbortable(value);
		if (p) {
			// Record following
			p._followed(this);

			if (p._canAbort) {
				// Follow promise
				this._follow(p);

				// Return resolution value
				return p;
			}
		}

		// Not followable
		this._clear();
		return value;
	},

	/**
	 * Abortable following an abortable.
	 * Record following or propagate abortion.
	 * @param {Promise} target - Promise which is followed by this one
	 * @returns {undefined}
	 */
	_follow(target) {
		// Remove abort handler
		this._abortHandler = undefined;

		if (this._isAborted) {
			// Propogate abortion
			this._abortPropagate(target);
		} else {
			// Record awaiting
			this._awaiting = target;
		}
	},

	/**
	 * Abortable followed by another Abortable.
	 * Is called on the *followed* Promise not the follower.
	 * Register follower and increment follower count.
	 * @private
	 * @param {Abortable} follower - Promise which is following this one
	 * @returns {undefined}
	 */
	_followed(follower) {
		// Increment unaborted followers/awaiters count
		this._unabortedCount++;

		// Add follower to array of followers
		pushOrCreate(this, '_followers', follower);
	},

	/**
	 * Promise resolved.
	 * Resolve all followers and clear state.
	 * @private
	 * @returns {undefined}
	 */
	_clear() {
		// Resolve all followers
		if (this._followers) {
			for (const p of this._followers) {
				p._clear();
			}
		}

		// Clear state
		this._canAbort = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followers = undefined;
		this._abortError = undefined;
		this._unabortedCount = undefined;
	},

	/**
	 * `onAbort()` called with abort handler.
	 * Register abort handler if Promise can be aborted.
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

		// If abort signal received already, call handler immediately
		if (this._isAborted) this._abortDo();
	},

	/**
	 * Prevent Promise being aborted.
	 * Mutates this Promise, rather than creating a new one.
	 * This is irrevocable.
	 * @returns {Abortable} - This Promise for chaining
	 */
	noAbort() {
		this._canAbort = false;
		return this;
	},

	/**
	 * Determine if Promise can be aborted.
	 * @returns {boolean} - `true` if can be aborted
	 */
	canAbort() {
		return this._canAbort;
	},

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
	},

	/**
	 * Then handler called.
	 * Call provided handler function.
	 * Resolve this Promise with result of handler function.
	 * Rethrow if handler function throws.
	 * @private
	 * @param {Function} handler - Then handler function
	 * @param {*} input - Input passed to handler function
	 * @param {*} ctx - `this` context then handler called with
	 * @returns {*} - Result of then handler
	 * @throws {*} - If error thrown by then handler
	 */
	_handled(handler, input, ctx) {
		try {
			const value = handler.call(ctx, input);
			return this._settled(value);
		} catch (err) {
			this._clear();
			throw err;
		}
	}
};
