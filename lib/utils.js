/* --------------------
 * abortable module
 * Utility functions
 * ------------------*/

'use strict';

// Exports

function isPromise(p) {
	if (!p) return false;
	return typeof p.then == 'function';
}

function isAbortable(p) {
	return isPromise(p) && !!p._isAbortable;
}

function once(fn) {
	let called = false, result;
	return function() {
		if (called) return result;
		called = true;
		result = fn.call(this, arguments);
		return result;
	};
}

module.exports = {isPromise, isAbortable, once};
