/* --------------------
 * abortable module
 * Tests utilities
 * ------------------*/

'use strict';

// Modules
const v8 = require('v8'),
	Abortable = require('abortable'),
	parseNodeVersion = require('parse-node-version');

// Enable V8 native functions
v8.setFlagsFromString('--allow-natives-syntax');

// Exports

module.exports = { // eslint-disable-line jest/no-export
	spy: jest.fn,
	tick,
	tryCatch,
	getRejectionReason,
	noUnhandledRejection,
	promiseStatus,
	runTestsWithAbortableAndPromise,
	createItWithSetupAndTeardown,
	isNode10: parseNodeVersion(process.version).major === 10
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

/**
 * Run same tests with `Abortable` and `Promise`.
 * `runTests()` is called with object with `PromiseOrAbortable`, `className` and `isAbortable` props.
 * @param {Function} runTests - Function to run tests
 * @returns {undefined}
 */
function runTestsWithAbortableAndPromise(runTests) {
	describe('Abortable', () => {
		runTests({
			PromiseOrAbortable: Abortable,
			className: 'Abortable',
			isAbortable: true
		});
	});

	describe('Promise', () => {
		runTests({
			PromiseOrAbortable: Promise,
			className: 'Promise',
			isAbortable: false
		});
	});
}

/**
 * Create `itWithSetup()` function.
 *
 * `itWithSetup()` is same as Jest's `it()` except it runs the setup function provided before
 * the test function, and the teardown function after.
 *
 * `setup()` returns an object. Test function and `teardown()` are called with this object.
 *
 * This is necessary rather than using Jest's `beforeEach()`, because `beforeEach()` sometimes
 * introduces a tick/microtick between `beforeEach()` and the `it()` test function.
 * This prevents some tests running correctly, as exact timing is important to the tests.
 *
 * In comparison, `itWithSetup()` runs the test function synchronously after `setup()`
 * and `teardown()` synchronously after test function. If `setup()` or test function return a Promise,
 * it is awaited before the next step. Return value of `teardown()` is always awaited.
 *
 * @param {Object} setupAndTeardown
 * @param {Function} [setupAndTeardown.setup] - Setup function (sync only)
 * @param {Function} [setupAndTeardown.teardown] - Teardown function (sync or async)
 * @returns {Function} - `itWithSetup` function
 */
function createItWithSetupAndTeardown({setup, teardown}) {
	if (!setup) setup = () => ({});
	if (!teardown) teardown = () => {};

	return function itWithSetup(testName, testFn) {
		it(testName, async () => { // eslint-disable-line jest/expect-expect
			let props = setup();
			if (props instanceof Promise) props = await props;

			try {
				const res = testFn(props);
				if (res instanceof Promise) await res;
			} finally {
				await teardown(props);
			}
		});
	};
}
