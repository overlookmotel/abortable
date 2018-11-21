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
		result = fn.apply(this, arguments);
		return result;
	};
}

function pushOrCreate(obj, propName, value) {
	const arr = obj[propName];

	if (!arr) {
		obj[propName] = [value];
		return 1;
	}

	return arr.push(value);
}

module.exports = {isPromise, isAbortable, once, pushOrCreate};
