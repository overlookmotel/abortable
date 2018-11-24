/* --------------------
 * abortable module
 * Utility functions
 * ------------------*/

'use strict';

// Exports

/**
 * Determine if value is a thenable.
 * @param {*} [value] - Value to test
 * @returns {boolean} - `true` if is a thenable
 */
function isPromise(value) {
	if (!value) return false;
	return typeof value.then == 'function';
}

/**
 * Determine if value is an Abortable that can be aborted.
 * @param {*} [value] - Value to test
 * @returns {boolean} - `true` if is an Abortable that can be aborted
 */
function isAbortable(value) {
	return isPromise(value) && !!value._isAbortable;
}

/**
 * Memoize function.
 * Wraps a function to ensure it is only called once.
 * First time wrapped function is called, it calls input function and returns its return value.
 * On any further calls, the input function is not called again and initial return value is returned.
 * @param {Function} - Input function
 * @returns {Function} - Wrapped function
 */
function once(fn) {
	let called = false, result;
	return function() {
		if (called) return result;
		called = true;
		result = fn.apply(this, arguments);
		return result;
	};
}

/**
 * Push value onto array at `obj[propName]` and return new length of array.
 * If no array exists at `obj[propName]`, a new array is created.
 * @param {Object} obj - Target object
 * @param {string} propName - Property name where array is to be found
 * @param {*} value - Value to add to array
 * @returns {undefined}
 */
function pushOrCreate(obj, propName, value) {
	const arr = obj[propName];

	if (!arr) {
		obj[propName] = [value];
	} else {
		arr.push(value);
	}
}

// Export functions
module.exports = {isPromise, isAbortable, once, pushOrCreate};
