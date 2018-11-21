/* --------------------
 * abortable module
 * ------------------*/

'use strict';

// Imports
const AbortError = require('./error'),
	DummyAbortable = require('./dummy'),
	all = require('./all'),
	race = require('./race'),
	abortable = require('./abortable'),
	_finally = require('./finally'),
	{isAbortable, pushOrCreate} = require('./utils');

// Exports

class Abortable extends Promise {
	constructor(executor) {
		let p = new DummyAbortable();

		super(function(resolve, reject) {
			return executor.call(
				this,
				function(res) {return p._resolved(resolve, res, this);},
				function(err) {return p._rejected(reject, err, this);},
				fn => p._onAbort(fn)
			);
		});

		const awaiting = p._awaiting;

		this._isAbortable = p._isAbortable;
		this._isFateSealed = p._isFateSealed;
		this._abortHandler = p._abortHandler;
		this._awaiting = awaiting;
		this._followers = undefined;
		this._abortError = undefined;
		this._abortCallbacks = undefined;
		this._unabortedCount = 0;

		if (awaiting) awaiting._followers[p._followerIndex] = this;

		p = this;
	}

	_resolved(resolve, res, ctx) {
		if (this._sealFate()) this._settled(res);
		return resolve.call(ctx, res);
	}

	_rejected(reject, err, ctx) {
		if (this._sealFate()) {
			if (this._abortError && err === this._abortError) this._abortDone();
			this._clear();
		}

		return reject.call(ctx, err);
	}

	_sealFate() {
		if (this._isFateSealed) return false;
		this._isFateSealed = true;
		return true;
	}

	_onAbort(fn) {
		if (!this._isAbortable) return;
		this._abortHandler = fn;
		if (this._abortError) this._abortDo();
	}

	_settled(res) {
		if (isAbortable(res)) {
			// Follow promise
			res._followed(this);

			// Propogate abortion
			if (this._abortError) this._abortPropagate(res);
		} else {
			this._clear();
		}
	}

	_followed(follower) {
		this._unabortedCount++;
		follower._awaiting = this;


		return pushOrCreate(this, '_followers', follower);
	}

	_clear() {
		// Resolve all followers
		if (this._followers) {
			for (let p of this._followers) {
				p._clear();
			}
		}

		// Clear all props
		this._isAbortable = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followers = undefined;
		this._abortError = undefined;
		this._abortCallbacks = undefined;
		this._unabortedCount = undefined;
	}

	noAbort() {
		this._isAbortable = false;
		return this;
	}

	isAbortable() {
		return this._isAbortable;
	}

	abort(err) {
		if (!this._isAbortable) return this;

		if (err == null) {
			err = new AbortError();
		} else if (!(err instanceof Error)) {
			throw new Error('.abort() must be called with an Error or null');
		}

		this._abortWithError(err);
		return this;
	}

	_abortWithError(err) {
		this._abortError = err;
		this._abort();
	}

	_abort() {
		this._isAbortable = false;

		if (this._abortHandler) {
			this._abortDo();
		} else if (this._awaiting) {
			this._abortPropagate(this._awaiting);
		}
	}

	_abortDo() {
		const {_abortHandler: handler, _abortError: err} = this;
		this._abortHandler = undefined;
		this._abortError = undefined;

		handler(err, () => this._abortDone());
	}

	_abortDone() {
		const callbacks = this._abortCallbacks;
		if (!callbacks) return;

		this._abortCallbacks = undefined;

		for (let cb of callbacks) {
			cb();
		}
	}

	_abortPropagate(target) {
		const err = this._abortError;
		this._abortError = undefined;

		target._abortIndirect(err, () => this._abortDone());
	}

	_abortIndirect(err, cb) {
		if (!this._abortError) this._abortError = err;

		pushOrCreate(this, '_abortCallbacks', cb);

		this._unabortedCount--;

		if (this._unabortedCount == 0) this._abort();
	}

	then(resolveHandler, rejectHandler) {
		if (typeof resolveHandler != 'function') resolveHandler = res => res;
		if (typeof rejectHandler != 'function') rejectHandler = err => {throw err;};

		const p = super.then(
			function(res) {return p._handled(resolveHandler, res, this);},
			function(err) {return p._handled(rejectHandler, err, this);}
		);

		this._unabortedCount++;

		if (this._isAbortable) p._awaiting = this;

		return p;
	}

	_handled(handler, input, ctx) {
		try {
			const res = handler.call(ctx, input);
			this._settled(res);
			return res;
		} catch (err) {
			this._clear();
			throw err;
		}
	}

	static resolve(value) {
		if (value instanceof Abortable) return value;

		return new Abortable(resolve => resolve(value));
	}

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

module.exports = Abortable;
