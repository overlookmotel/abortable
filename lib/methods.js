/* --------------------
 * abortable module
 * Abortable class prototype methods to be merged into Abortable.
 * ------------------*/

'use strict';

// Imports
const {toAbortable, pushOrCreate} = require('./utils.js');

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
		this._debug('resolved');

		if (this._sealFate()) value = this._settled(value);
		const res = resolve.call(ctx, value);

		if (this._debugEnabled()) {
			Promise.resolve().then(() => {
				this._debug('resolved next tick', `(_expectingInternalThen: ${this._expectingInternalThen})`);
			});
		}

		return res;
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
		this._debug('rejected');

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
		this._debug('settled');

		// If result cannot be followed, exit
		const target = toAbortable(value);
		if (!target || !target._canAbort) {
			this._clear();
			return value;
		}

		// Follow result
		// Remove abort handler
		this._abortHandler = undefined;

		// Record following on target
		target._followed(this);

		if (this._isAborted) {
			// Propogate abortion
			this._abortPropagate(target);
		} else {
			// Record following on source
			this._awaiting = target;
		}

		// Return wrapped value
		return target;
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
		this._debug('followed', `(followed by ${this._debugName(follower)})`);

		this._followedIncrementCount();
		this._followedRecordFollower(follower);
	},

	_followedIncrementCount() {
		this._debug('followedIncrementCount');

		// Increment unaborted followers/awaiters count + flag as expecting internal `.then()` call.
		// Purpose of unaborted count is to ensure that abort is only initiated if all this promise's
		// followers and awaiters want an abort (unanimous decision).
		// Difficulty is that, native Promise implementation will also call `.then()` which usually
		// also increments the count.
		// Unless `resolve()` is called synchronously within the Abortable constructor, `.then()`
		// will be called in the next tick after this.
		// Therefore can't rely on `.then()` to increment count at right time - `.abort()` could
		// be called in between and the Abortable aborted although unanimous decision has not actually
		// been reached.
		// So solution is to increment count here, and keep track that there's a `.then()` call expected.
		// When that `.then()` call comes, it will not increment the count again.
		this._unabortedCount++;
		Promise.resolve().then(() => { this._expectingInternalThen = true; });
	},

	_followedRecordFollower(follower) {
		this._debug('followedRecord', `(followed by ${this._debugName(follower)})`);

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
