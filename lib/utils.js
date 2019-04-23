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
	return typeof value.then === 'function';
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
	return typeof value.abort === 'function';
}

/**
 * Determine if value is an instance of Abortable class.
 * `value` must be tested that it is not null/undefined before calling this function.
 * @param {*} [value] - Value to test
 * @returns {boolean} - `true` if is an Abortable that can be aborted
 */
function isAbortableInstance(value) {
	return value[IS_ABORTABLE] === true;
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
module.exports = {isPromise, isAbortable, isAbortableSimple, isAbortableInstance, pushOrCreate};
