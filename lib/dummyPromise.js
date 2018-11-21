/* --------------------
 * abortable module
 * DummyPromise class
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./'),
	{isAbortable} = require('./utils');

// Exports

class DummyPromise {
	constructor() {
		this._isAbortable = true;
		this._isFateSealed = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followerIndex = undefined;
	}

	_resolved(resolve, res, ctx) {
		if (this._sealFate()) {
			if (isAbortable(res)) {
				this._followerIndex = res._followed(this) - 1;
			} else {
				this._clear();
			}
		}

		return resolve.call(ctx, res);
	}

	_rejected(reject, err, ctx) {
		if (this._sealFate()) this.clear();

		return reject.call(ctx, err);
	}

	_clear() {
		this._isAbortable = false;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followerIndex = undefined;
	}

	_onAbort(fn) {
		if (this._isAbortable) this._abortHandler = fn;
	}
}

DummyPromise.prototype._sealFate = Abortable.prototype._sealFate;

module.exports = DummyPromise;
