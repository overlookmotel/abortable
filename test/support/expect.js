/* --------------------
 * abortable module
 * Tests `expect` extensions
 * ------------------*/

'use strict';

// Modules
const {printReceived} = require('jest-matcher-utils');

// Imports
const {promiseStatus} = require('./utils.js');

// Extend `expect`

expect.extend({
	toBePendingPromise,
	toBeResolvedPromise,
	toBeRejectedPromise,
	toBePromiseWithStatus
});

/*
 * Expect value to be Promise with status
 */
function toBePendingPromise(received) {
	return toBePromiseWithStatus(received, 'pending');
}

function toBeResolvedPromise(received) {
	return toBePromiseWithStatus(received, 'resolved');
}

function toBeRejectedPromise(received) {
	return toBePromiseWithStatus(received, 'rejected');
}

function toBePromiseWithStatus(received, expectedStatus) {
	let failMessage;
	if (received instanceof Promise) {
		const status = promiseStatus(received);
		if (status !== expectedStatus) failMessage = `is ${status}`;
	} else {
		failMessage = 'is not a Promise';
	}

	const pass = !failMessage;
	return {
		message: () => `expected ${printReceived(received)}${pass ? ' not' : ''} to be a ${expectedStatus} Promise${failMessage ? ` but ${failMessage}` : ''}`,
		pass
	};
}
