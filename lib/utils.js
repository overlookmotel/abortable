/* --------------------
 * abortable module
 * Utility functions
 * ------------------*/

'use strict';

// Imports
const {IS_ABORTABLE} = require('./constants');

// Exports

/**
 * Determine if value is a thenable.
 * `value` must be tested that it is not null/undefined before calling this function.
 * @param {*} value - Value to test
 * @returns {boolean} - `true` if is a thenable
 */
function isPromise(value) {
	return typeof value.then == 'function';
}

/**
 * Determine if value is an abortable
 * i.e. has `.then()` and `.abort()` methods.
 * `value` must be tested that it is not null/undefined before calling this function.
 *
 * @param {*} [value] - Value to test
 * @returns {boolean} - `true` if is an abortable
 */
function isAbortable(value) {
	return isPromise(value) && isAbortableSimple(value);
}

/**
 * Determine if value has `.abort()` method
 * `value` must be tested that it is not null/undefined before calling this function.
 *
 * @param {*} [value] - Value to test
 * @returns {boolean} - `true` if has `.abort()` method
 */
function isAbortableSimple(value) {
	return typeof value.abort == 'function';
}

/**
 * Determine if value is an instance of Abortable class.
 * `value` must be tested that it is not null/undefined before calling this function.
 * @param {*} [value] - Value to test
 * @returns {boolean} - `true` if is an Abortable that can be aborted
 */
function isAbortableInstance(value) {
	return value[IS_ABORTABLE] == true;
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
module.exports = {isPromise, isAbortable, isAbortableSimple, isAbortableInstance, once, pushOrCreate};
