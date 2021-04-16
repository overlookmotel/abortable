/* --------------------
 * abortable module
 * Tests for `Abortable.all()`
 * ------------------*/

'use strict';

// Modules
const Abortable = require('abortable'),
	parseNodeVersion = require('parse-node-version');

// Imports
const {noUnhandledRejection, getRejectionReason, promiseStatus} = require('./support/utils.js');

// Init
require('./support/index.js');

// Tests

const isNode10 = parseNodeVersion(process.version).major === 10;

describe('Abortable.all', () => {
	it('returns Abortable', () => {
		const p = Abortable.all([]);
		expect(p).toBeInstanceOf(Abortable);
	});

	describe('when passed empty array, returns Abortable which is', () => {
		it('already resolved', () => {
			const p = Abortable.all([]);
			expect(p).toBeResolvedPromise();
		});

		it('already resolved, same as Promise', () => {
			const p = Promise.all([]);
			expect(p).toBeResolvedPromise();
		});

		it('not abortable', () => {
			const p = Abortable.all([]);
			expect(p.canAbort()).toBeFalse();
		});
	});

	// TODO Tests for normal behaviour with valid iterables
	// TODO Test sync abort does not abort promises which are already followed elsewhere

	describe('when passed non-iterable, returns Abortable which is', () => {
		let p;
		beforeEach(() => {
			p = Abortable.all(undefined);
		});
		afterEach(() => {
			noUnhandledRejection(p);
		});

		it('Abortable instance', () => { // eslint-disable-line jest/lowercase-name
			expect(p).toBeInstanceOf(Abortable);
		});

		it('already rejected', () => {
			expect(p).toBeRejectedPromise();
		});

		it('already rejected, same as Promise', () => {
			const p2 = Promise.all(undefined);
			expect(p2).toBeRejectedPromise();
			noUnhandledRejection(p2);
		});

		it('rejected with TypeError', async () => {
			const err = await getRejectionReason(p);
			expect(err).toBeInstanceOf(TypeError);
			expect(err.message).toBe('iterable is not iterable');
		});

		it('rejected with TypeError, same as Promise', async () => {
			const p2 = Promise.all(undefined);
			const err = await getRejectionReason(p2);
			expect(err).toBeInstanceOf(TypeError);
			expect(err.message).toBe(
				isNode10
					? "Cannot read property 'Symbol(Symbol.iterator)' of undefined"
					: 'undefined is not iterable (cannot read property Symbol(Symbol.iterator))'
			);
		});

		it('not abortable', () => {
			expect(p.canAbort()).toBeFalse();
		});
	});

	describe('when passed non-iterable object, returns Abortable which is', () => {
		let p;
		beforeEach(() => {
			p = Abortable.all({});
		});
		afterEach(() => {
			noUnhandledRejection(p);
		});

		it('Abortable instance', () => { // eslint-disable-line jest/lowercase-name
			expect(p).toBeInstanceOf(Abortable);
		});

		it('already rejected', () => {
			expect(p).toBeRejectedPromise();
		});

		it('already rejected, same as Promise', () => {
			const p2 = Promise.all({});
			expect(p2).toBeRejectedPromise();
			noUnhandledRejection(p2);
		});

		it('rejected with TypeError', async () => {
			const err = await getRejectionReason(p);
			expect(err).toBeInstanceOf(TypeError);
			expect(err.message).toBe('iterable is not iterable');
		});

		it('rejected with TypeError, same as Promise', async () => {
			const p2 = Promise.all({});
			const err = await getRejectionReason(p2);
			expect(err).toBeInstanceOf(TypeError);
			expect(err.message).toBe(
				isNode10
					? '#<Object> is not iterable'
					: 'object is not iterable (cannot read property Symbol(Symbol.iterator))'
			);
		});

		it('not abortable', () => {
			expect(p.canAbort()).toBeFalse();
		});
	});

	describe(
		'when passed iterable with `[Symbol.iterator]()` method that returns invalid iterator, returns Abortable which is',
		() => {
			function createIterable() {
				return {
					[Symbol.iterator]() {
						return {};
					}
				};
			}

			let p;
			beforeEach(() => {
				p = Abortable.all(createIterable());
			});
			afterEach(() => {
				noUnhandledRejection(p);
			});

			it('Abortable instance', () => { // eslint-disable-line jest/lowercase-name
				expect(p).toBeInstanceOf(Abortable);
			});

			it('already rejected', () => {
				expect(p).toBeRejectedPromise();
			});

			it('already rejected, same as Promise', () => {
				const p2 = Promise.all(createIterable());
				expect(p2).toBeRejectedPromise();
				noUnhandledRejection(p2);
			});

			it('rejected with TypeError', async () => {
				const err = await getRejectionReason(p);
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('undefined is not a function');
			});

			it('rejected with TypeError, same as Promise', async () => {
				const p2 = Promise.all(createIterable());
				const err = await getRejectionReason(p2);
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('undefined is not a function');
			});

			it('not abortable', () => {
				expect(p.canAbort()).toBeFalse();
			});
		}
	);

	describe(
		'when passed iterable with `[Symbol.iterator]()` method that throws, returns Abortable which is',
		() => {
			function createIterableAndError() {
				const err = new Error('foo');
				const iterable = {
					[Symbol.iterator]() {
						throw err;
					}
				};
				return {err, iterable};
			}

			let p, expectedErr;
			beforeEach(() => {
				const {err, iterable} = createIterableAndError();
				expectedErr = err;
				p = Abortable.all(iterable);
			});
			afterEach(() => {
				noUnhandledRejection(p);
			});

			it('Abortable instance', () => { // eslint-disable-line jest/lowercase-name
				expect(p).toBeInstanceOf(Abortable);
			});

			it('already rejected', () => {
				expect(p).toBeRejectedPromise();
			});

			it('already rejected, same as Promise', () => {
				const p2 = Promise.all(createIterableAndError().iterable);
				expect(p2).toBeRejectedPromise();
				noUnhandledRejection(p2);
			});

			it('rejected with thrown error', async () => {
				const err = await getRejectionReason(p);
				expect(err).toBe(expectedErr);
			});

			it('rejected with thrown error, same as Promise', async () => {
				const {err: expectedErr2, iterable} = createIterableAndError();
				const p2 = Promise.all(iterable);
				const err = await getRejectionReason(p2);
				expect(err).toBe(expectedErr2);
			});

			it('not abortable', () => {
				expect(p.canAbort()).toBeFalse();
			});
		}
	);

	describe('when passed iterable returning iterator with `.next()` method that returns invalid value', () => {
		describe('on first iteration, returns Abortable which is', () => {
			runTests(() => ({
				[Symbol.iterator]() {
					return {
						next() {
							return undefined;
						}
					};
				}
			}));
		});

		describe('on later iteration, returns Abortable which is', () => {
			runTests(() => ({
				[Symbol.iterator]() {
					let count = 0;
					return {
						next() {
							if (count < 4) return {value: count++, done: false};
							return undefined;
						}
					};
				}
			}));
		});

		function runTests(createIterable) {
			let p;
			beforeEach(() => {
				const iterable = createIterable();
				p = Abortable.all(iterable);
			});

			afterEach(() => {
				noUnhandledRejection(p);
			});

			it('Abortable instance', () => { // eslint-disable-line jest/lowercase-name
				expect(p).toBeInstanceOf(Abortable);
			});

			it('already rejected', () => {
				expect(p).toBeRejectedPromise();
			});

			it('already rejected, same as Promise', () => {
				const p2 = Promise.all(createIterable());
				expect(p2).toBeRejectedPromise();
				noUnhandledRejection(p2);
			});

			it('rejected with thrown error', async () => {
				const err = await getRejectionReason(p);
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('Iterator result undefined is not an object');
			});

			it('rejected with thrown error, same as Promise', async () => {
				const p2 = Promise.all(createIterable());
				const err = await getRejectionReason(p2);
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('Iterator result undefined is not an object');
			});

			it('not abortable', () => {
				expect(p.canAbort()).toBeFalse();
			});
		}
	});

	describe('when passed iterable returning iterator with `.next()` method that throws', () => {
		describe('on first iteration, returns Abortable which is', () => {
			runTests(() => {
				const err = new Error('foo');
				const iterable = {
					[Symbol.iterator]() {
						return {
							next() {
								throw err;
							}
						};
					}
				};
				return {err, iterable};
			});
		});

		describe('on later iteration, returns Abortable which is', () => {
			runTests(() => {
				const err = new Error('foo');
				const iterable = {
					[Symbol.iterator]() {
						let count = 0;
						return {
							next() {
								if (count < 4) return {value: count++, done: false};
								throw err;
							}
						};
					}
				};
				return {err, iterable};
			});
		});

		function runTests(createIterableAndError) {
			let p, expectedErr;
			beforeEach(() => {
				const {err, iterable} = createIterableAndError();
				expectedErr = err;
				p = Abortable.all(iterable);
			});

			afterEach(() => {
				noUnhandledRejection(p);
			});

			it('Abortable instance', () => { // eslint-disable-line jest/lowercase-name
				expect(p).toBeInstanceOf(Abortable);
			});

			it('already rejected', () => {
				expect(p).toBeRejectedPromise();
			});

			it('already rejected, same as Promise', () => {
				const p2 = Promise.all(createIterableAndError().iterable);
				expect(p2).toBeRejectedPromise();
				noUnhandledRejection(p2);
			});

			it('rejected with thrown error', async () => {
				const err = await getRejectionReason(p);
				expect(err).toBe(expectedErr);
			});

			it('rejected with thrown error, same as Promise', async () => {
				const {err: expectedErr2, iterable} = createIterableAndError();
				const p2 = Promise.all(iterable);
				const err = await getRejectionReason(p2);
				expect(err).toBe(expectedErr2);
			});

			it('not abortable', () => {
				expect(p.canAbort()).toBeFalse();
			});
		}
	});

	// TODO Tests for thenables with getter on `.then` property which throws
	// TODO Tests for thenables with getter on `.abort` property which throws
	// TODO Tests for thenables with getter on `[IS_ABORTABLE]` property which throws
	// TODO Tests for thenables with `.then` method which throws
	// TODO Tests for timing for thenables which call callback async

	describe('timing', () => {
		runTest('runs in sequence', Abortable);
		runTest('runs in sequence, same as Promise', Promise);

		function runTest(testName, PromiseOrAbortable) {
			it(testName, async () => {
				const calls = [];
				const called = callName => calls.push(callName);

				const iterable = {
					[Symbol.iterator]() {
						called('iterator');
						let count = 0;
						return {
							next() {
								const index = count++;
								called(`next ${index}`);
								return index < 4
									? {
										value: {
											get then() {
												called(`then getter ${index}`);
												return (resolveHandler) => {
													called(`then ${index}`);
													resolveHandler(index);
												};
											}
										},
										done: false
									}
									: {value: undefined, done: true};
							}
						};
					}
				};

				Promise.resolve().then(() => called('before microtick'));

				const p = PromiseOrAbortable.all(iterable);
				called('sync');

				const pTicks = Promise.resolve()
					.then(() => called(`after microtick = ${promiseStatus(p)}`))
					.then(() => called(`after 2 microticks = ${promiseStatus(p)}`));

				await Promise.all([pTicks, p]);

				expect(calls).toEqual([
					'iterator',
					'next 0',
					'then getter 0',
					'next 1',
					'then getter 1',
					'next 2',
					'then getter 2',
					'next 3',
					'then getter 3',
					'next 4',
					'sync',
					'before microtick',
					'then 0',
					'then 1',
					'then 2',
					'then 3',
					'after microtick = pending',
					'after 2 microticks = resolved'
				]);
			});
		}
	});
});
