/* --------------------
 * abortable module
 * Tests utilities
 * ------------------*/

'use strict';

// Modules
const v8 = require('v8');

// Enable V8 native functions
v8.setFlagsFromString('--allow-natives-syntax');

// Exports

module.exports = {
	spy: jest.fn,
	tick,
	tryCatch,
	getRejectionReason,
	noUnhandledRejection,
	promiseStatus
};

function tick() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

function tryCatch(fn) {
	try {
		fn();
		return undefined;
	} catch (err) {
		return err;
	}
}

async function getRejectionReason(p) {
	let err;
	await p.catch((_err) => { err = _err; });
	return err;
}

function noUnhandledRejection(p) {
	return p.catch(() => {});
}

/**
 * Get Promise status synchronously, using V8 native function `%PromiseStatus()`.
 * @param {Promise} promise - Promise
 * @returns {string} - Promise status ('pending', 'resolved' or 'rejected')
 */
function promiseStatus(promise) {
	// eslint-disable-next-line no-use-before-define
	return PROMISE_STATUSES[promiseStatusNative(promise)] || 'unknown';
}

// eslint-disable-next-line no-new-func
const promiseStatusNative = new Function('promise', 'return %PromiseStatus(promise);');
const PROMISE_STATUSES = ['pending', 'resolved', 'rejected'];
