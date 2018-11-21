/* --------------------
 * abortable module
 * ------------------*/

'use strict';

// Imports
const AbortError = require('./error'),
	DummyPromise = require('./dummyPromise'),
	all = require('./all'),
	race = require('./race'),
	_finally = require('./finally'),
	{isAbortable} = require('./utils');

// Exports

class Abortable extends Promise {
	constructor(executor) {
		let p = new DummyPromise();

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
		this._settled(res);
		return resolve.call(ctx, res);
	}

	_rejected(reject, err, ctx) {
		if (this._abortError && err === this._abortError) this._abortDone();

		this._clear();
		return reject.call(ctx, err);
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

	_followed(p) {
		this._unabortedCount++;
		p._awaiting = this;

		if (!this._followers) {
			this._followers = [p];
			return 1;
		}

		return this._followers.push(p);
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

		if (!this._abortCallbacks) {
			this._abortCallbacks = [cb];
		} else {
			this._abortCallbacks.push(cb);
		}

		this._unabortedCount--;
		if (this._unabortedCount > 0) return;

		this._abort();
	}

	then(resolveHandler, rejectHandler) {
		const p = super.then(
			function(res) {return p._handled(resolveHandler, res, this);},
			function(err) {return p._handled(rejectHandler, err, this);}
		);

		if (this._isAbortable) {
			this._unabortedCount++;
			p._awaiting = this;
		}

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

	static resolve(res) {
		if (res instanceof Abortable) return res;

		return Abortable.follow(res);
	}

	static reject(err) {
		return new Abortable((resolve, reject) => reject(err)); // jshint ignore:line
	}

	follow() {
		return Abortable.follow(this);
	}

	static follow(p) {
		return new Abortable(resolve => resolve(p));
	}
}

Abortable.AbortError = AbortError;
Abortable.isAbortable = isAbortable;
Abortable.all = all;
Abortable.race = race;
Abortable.prototype.finally = _finally;

module.exports = Abortable;
