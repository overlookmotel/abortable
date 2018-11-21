/* --------------------
 * abortable module
 * Utility functions
 * ------------------*/

'use strict';

// Exports

function isPromise(value) {
	if (!value) return false;
	return typeof value.then == 'function';
}

function isAbortable(value) {
	return isPromise(value) && !!value._isAbortable;
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
