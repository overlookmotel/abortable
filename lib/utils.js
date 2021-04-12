/* --------------------
 * abortable module
 * Utility functions
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js'),
	{IS_ABORTABLE} = require('./constants.js');

// Exports

module.exports = {
	isPromise,
	isAbortable,
	isAbortableSimple,
	isAbortableInstance,
	toAbortable,
	pushOrCreate,
	nextMicrotick,
	definePrivateProps
};

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
 * Determine if value has `.abort()` method.
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
 * @returns {boolean} - `true` if is an Abortable class instance
 */
function isAbortableInstance(value) {
	return value[IS_ABORTABLE] === true;
}

/**
 * Convert value to Abortable if it can be.
 * Return existing Abortable unchanged.
 * Wrap objects with `.then()` and `.abort()` methods in an Abortable.
 * Return `null` if cannot be converted to an Abortable.
 * @param {*} value - Input value
 * @returns {Abortable|null}
 */
function toAbortable(value) {
	if (!value) return null;
	if (isAbortableInstance(value)) return value;
	if (!isAbortable(value)) return null;

	// Wrap in Abortable
	const p = new Abortable((resolve, reject) => {
		value.then(resolve, reject);
	});

	// Register abort handler (unless has been synchronously resolved/rejected)
	if (!p._isFateSealed) {
		p._abortHandler = err => value.abort(err);
		p._onAbortWasCalled = true;
	}

	return p;
}

/**
 * Push value onto array at `obj[propName]`.
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

/**
 * Call function after 1 microtick.
 * @param {Function} fn - Callback
 * @returns {undefined}
 */
function nextMicrotick(fn) {
	resolvedPromise.then(fn); // eslint-disable-line no-use-before-define
}

const resolvedPromise = Promise.resolve();

/**
 * Define non-configurable, non-enumerable properties on object.
 * @param {Object} obj - Object to add properties to
 * @param {Object} props - Properties object
 * @returns {undefined}
 */
function definePrivateProps(obj, props) {
	for (const propName of Object.keys(props)) {
		Object.defineProperty(obj, propName, {
			value: props[propName],
			writable: true
		});
	}
}
