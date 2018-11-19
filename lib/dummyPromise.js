/* --------------------
 * abortable module
 * DummyPromise class
 * ------------------*/

'use strict';

// Imports
const {isAbortable} = require('./utils');

// Exports

class DummyPromise {
	constructor() {
		this._isAbortable = true;
		this._abortHandler = undefined;
		this._awaiting = undefined;
		this._followerIndex = undefined;
	}

	_resolved(resolve, res, ctx) {
		if (isAbortable(res)) {
			this._followerIndex = res._followed(this) - 1;
		} else {
			this._clear();
		}

		return resolve.call(ctx, res);
	}

	_rejected(reject, err, ctx) {
		this.clear();
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

module.exports = DummyPromise;
