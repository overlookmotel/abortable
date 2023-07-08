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
	getThenMethod,
	getAbortMethod,
	getThenAndAbortMethods,
	isAbortableInstance,
	toAbortable,
	pushOrCreate,
	nextMicrotick,
	nowOrNextMicrotick,
	definePrivateProps
};

/**
 * Get `.then` property of value if it is a function.
 * `value` must be tested that it is not null/undefined before calling this function.
 * @param {*} [value] - Value to test
 * @returns {Function|null} - `.then` property if is promise, otherwise null
 */
function getThenMethod(value) {
	const {then} = value;
	return typeof then === 'function' ? then : null;
}

/**
 * Get `.abort` property of value if it is a function.
 * `value` must be tested that it is a promise before calling this function.
 * @param {*} [value] - Value to test
 * @returns {Function|null} - `.abort` property if is promise, otherwise null
 */
function getAbortMethod(value) {
	const {abort} = value;
	return typeof abort === 'function' ? abort : null;
}

/**
 * Determine if value is an abortable i.e. has `.then()` and `.abort()` methods.
 * If it is, return object duplicating value's `.then` + `.abort` properties, otherwise return `null`.
 * `value` must be tested that it is not null/undefined before calling this function.
 * @param {*} [value] - Value to test
 * @returns {Object|null} - Object of form `{then, abort}` if is abortable, otherwise `null`
 */
function getThenAndAbortMethods(value) {
	const then = getThenMethod(value);
	if (!then) return null;
	const abort = getAbortMethod(value);
	if (!abort) return null;
	return {then, abort};
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
	const thenAndAbort = getThenAndAbortMethods(value);
	if (!thenAndAbort) return null;

	// Wrap in Abortable
	const p = new Abortable((resolve, reject) => {
		thenAndAbort.then.call(value, resolve, reject);
	});

	// Register abort handler (unless has been synchronously resolved/rejected)
	if (!p._isFateSealed) {
		const {abort} = thenAndAbort;
		p._abortHandler = err => abort.call(value, err);
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
 * TODO: Use `quickMicrotask()` instead.
 * @param {Function} fn - Callback
 * @returns {undefined}
 */
function nextMicrotick(fn) {
	resolvedPromise.then(fn); // eslint-disable-line no-use-before-define
}

const resolvedPromise = Promise.resolve();

/**
 * Call function either synchronously or in next microtick, dependent on flag.
 * @param {Function} fn - Function to call
 * @param {boolean} callInNextMicrotick - `true` if should be called in next microtick
 * @returns {undefined}
 */
function nowOrNextMicrotick(fn, callInNextMicrotick) {
	if (callInNextMicrotick) {
		nextMicrotick(fn);
	} else {
		fn();
	}
}

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
