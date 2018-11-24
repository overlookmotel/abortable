/* --------------------
 * abortable module
 * ------------------*/

'use strict';

// Imports
const {IS_ABORTABLE} = require('./constants'),
	AbortError = require('./error'),
	DummyAbortable = require('./dummy'),
	all = require('./all'),
	race = require('./race'),
	abortable = require('./abortable'),
	_finally = require('./finally'),
	{isAbortable, pushOrCreate} = require('./utils'),
	{version} = require('../package.json');

// Exports

class Abortable extends Promise {
	/**
	 * @constructor
	 * @param {Function} executor - Executor function.
	 *   Called with args `(resolve, reject, onAbort)`.
	 */
	constructor(executor) {
		// Create dummy abortable object to catch events before `this` is available
		let p = new DummyAbortable();

		// Create Abortable, passing extra arg `onAbort` to executor function
		super(function(resolve, reject) {
			return executor.call(
				this,
				function(value) {return p._resolved(resolve, value, this);},
				function(err) {return p._rejected(reject, err, this);},
				fn => p._onAbort(fn)
			);
		});

		// Init Abortable and transfer state from dummy
		const awaiting = p._awaiting;

		this._canAbort = p._canAbort;
		this._isFateSealed = p._isFateSealed;
		this._abortHandler = p._abortHandler;
		this._awaiting = awaiting;
		this._followers = undefined;
		this._abortError = undefined;
		this._abortCallbacks = undefined;
		this._unabortedCount = 0;

		// If following, record following
		if (p._following) awaiting._followed(this);

		p = this;
	}

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
		if (this._sealFate()) this._settled(value);
		return resolve.call(ctx, value);
	}

	/**
	 * Executor reject callback called.
	 * If rejected with abort error, abort is considered successful.
	 * If resolve / reject callback has already been called, this later call is ignored.
	 * @private
	 * @param {Function} reject - Reject callback
	 * @param {*} err - Value passed to reject callback
	 * @param {*} ctx - `this` context reject callback called on
	 * @returns {*} - Return value of native reject callback
	 */
	_rejected(reject, err, ctx) {
		if (this._sealFate()) {
			if (this._abortError && err === this._abortError) this._abortDone();
			this._clear();
		}

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
	 * If resolved with an Abortable, follow it.
	 * Propagate abortion if this Promise is aborted.
	 * @private
	 * @param {*} value - Value promise resolved with
	 * @returns {undefined}
	 */
	_settled(value) {
		if (isAbortable(value)) {
			// Settled with an Abortable
			// Flag awaiting result
			this._awaiting = value;

			// Follow promise
			value._followed(this);

			// Propogate abortion
			if (this._abortError) this._abortPropagate(value);
		} else {
			this._clear();
		}
	}

	/**
	 * Abortable followed by another Abortable.
	 * Is called on the *followed* Promise not the follower.
	 * Register follower and increment follower count.
	 * @private
	 * @param {Abortable} follower - Promise which is following this one.
	 * @returns {undefined}
	 */
	_followed(follower) {
		// Increment unaborted followers/awaiters count
		this._unabortedCount++;

		// Add follower to array of followers
		pushOrCreate(this, '_followers', follower);
	}

	/**
	 * Promise resolved.
	 * Resolve all followers and clear state.
	 * @private
	 * @returns {undefined}
	 */
	_clear() {
		// Resolve all followers
		if (this._followers) {
			for (let p of this._followers) {
				p._clear();
			}
		}

		// Clear state
		this._canAbort = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followers = undefined;
		this._abortError = undefined;
		this._abortCallbacks = undefined;
		this._unabortedCount = undefined;
	}

	/**
	 * `onAbort()` called with abort handler.
	 * Register abort handler if Promise can be aborted.
	 * @private
	 * @param {Function} fn - Abort handler
	 * @returns {undefined}
	 */
	_onAbort(fn) {
		if (!this._canAbort) return;
		this._abortHandler = fn;
		if (this._abortError) this._abortDo();
	}

	/**
	 * Prevent Promise being aborted.
	 * Mutates this Promise, rather than creating a new one.
	 * This is irrevocable.
	 * @returns {Abortable} - This Promise for chaining
	 */
	noAbort() {
		this._canAbort = false;
		return this;
	}

	/**
	 * Determine if Promise can be aborted.
	 * @returns {boolean} - `true` if can be aborted
	 */
	canAbort() {
		return this._canAbort;
	}

	/**
	 * Abort Promise.
	 * @param {Error} [err] - Optional error to abort with
	 * @returns {Abortable} - This Promise for chaining
	 */
	abort(err) {
		if (!this._canAbort) return this;

		if (err == null) {
			err = new AbortError();
		} else if (!(err instanceof Error)) {
			throw new Error('.abort() must be called with an Error or null');
		}

		this._abortWithError(err);
		return this;
	}

	/**
	 * Abort Promise with provided error.
	 * @private
	 * @returns {undefined}
	 */
	_abortWithError(err) {
		this._abortError = err;
		this._abort();
	}

	/**
	 * Abort Promise - either directly or by propagating abortion up chain.
	 * @private
	 * @returns {undefined}
	 */
	_abort() {
		this._canAbort = false;

		if (this._abortHandler) {
			this._abortDo();
		} else if (this._awaiting) {
			this._abortPropagate(this._awaiting);
		}
	}

	/**
	 * Abort this Promise directly by calling abort handler.
	 * @private
	 * @returns {undefined}
	 */
	_abortDo() {
		const {_abortHandler: handler, _abortError: err} = this;
		this._abortHandler = undefined;
		this._abortError = undefined;

		handler(err, () => this._abortDone());
	}

	/**
	 * Abortion is successful. Call all abort callbacks.
	 * @private
	 * @returns {undefined}
	 */
	_abortDone() {
		// Clear callbacks
		const callbacks = this._abortCallbacks;
		if (!callbacks) return;

		this._abortCallbacks = undefined;

		// Call callbacks
		for (let cb of callbacks) {
			cb();
		}
	}

	/**
	 * Propagate abortion to another Promise.
	 * @private
	 * @param {Abortable} target - Promise to propagate to
	 * @returns {undefined}
	 */
	_abortPropagate(target) {
		const err = this._abortError;
		this._abortError = undefined;

		target._abortIndirect(err, () => this._abortDone());
	}

	/**
	 * Abort Promise if all Promises following/awaiting this one have called abort.
	 * If not all followers/awaiters have aborted, register callback for if/when they do.
	 * @private
	 * @param {Error} err - Error to abort with
	 * @param {Function} cb - Callback to be called when abort succeeds
	 * @returns {undefined}
	 */
	_abortIndirect(err, cb) {
		// If not already aborted by another follower/awaiter, record abort error
		if (!this._abortError) this._abortError = err;

		// Register abort callback
		pushOrCreate(this, '_abortCallbacks', cb);

		// Decrement unaborted followers/awaiters count
		this._unabortedCount--;

		// If all followers/awaiters have requested abort, abort
		if (this._unabortedCount == 0) this._abort();
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
		if (typeof resolveHandler != 'function') resolveHandler = value => value;
		if (typeof rejectHandler != 'function') rejectHandler = err => {throw err;};

		const p = super.then(
			function(value) {return p._handled(resolveHandler, value, this);},
			function(err) {return p._handled(rejectHandler, err, this);}
		);

		// Increment unaborted followers/awaiters count
		this._unabortedCount++;

		// Set chained Promise to await this Promise
		if (this._canAbort) p._awaiting = this;

		// Return new Promise
		return p;
	}

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
			this._settled(value);
			return value;
		} catch (err) {
			this._clear();
			throw err;
		}
	}

	/**
	 * Replacement `.resolve()` static method.
	 * Create new Abortable, resolved with value provided.
	 * If value is an instance of this Abortable class, return it unchanged.
	 * @param {*} [value] - Value to resolve Promise with
	 * @returns {Abortable}
	 */
	static resolve(value) {
		// If value is an instance of Abortable class, return it unchanged
		if (value instanceof Abortable) return value;

		// Create new Abortable, resolved with value
		return new Abortable(resolve => resolve(value));
	}

	/**
	 * Replacement `.reject()` static method.
	 * Create new Abortable, rejected with reason provided.
	 * @param {*} [reason] - Value to reject Promise with
	 * @returns {Abortable}
	 */
	static reject(reason) {
		return new Abortable((resolve, reject) => reject(reason)); // jshint ignore:line
	}
}

Abortable.AbortError = AbortError;
Abortable.isAbortable = isAbortable;
Abortable.all = all;
Abortable.race = race;
Abortable.abortable = abortable;
Abortable.prototype.finally = _finally;

Abortable.prototype[IS_ABORTABLE] = true;

Abortable.version = version;

module.exports = Abortable;
