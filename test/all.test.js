/* --------------------
 * abortable module
 * Tests for `Abortable.all()`
 * ------------------*/

'use strict';

/* eslint jest/no-standalone-expect: ["error", { "additionalTestBlockFunctions": ["itWithSetup"] }] */

// Imports
const {
	runTestsWithAbortableAndPromise, createItWithSetupAndTeardown,
	noUnhandledRejection, getRejectionReason, promiseStatus, tick, spy, isNode10
} = require('./support/utils.js');

// Init
require('./support/index.js');

// Tests

describe('Abortable.all', () => {
	describe('when passed empty array', () => {
		runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
			const itWithSetup = createItWithSetupAndTeardown({
				setup() {
					const p = PromiseOrAbortable.all([]);
					return {p};
				},
				teardown: ({p}) => p
			});

			describe(`returns ${className} which is`, () => {
				itWithSetup(`${className} class instance`, ({p}) => {
					expect(p).toBeInstanceOf(PromiseOrAbortable);
				});

				itWithSetup('already resolved', ({p}) => {
					expect(p).toBeResolvedPromise();
				});

				if (isAbortable) {
					itWithSetup('not abortable', ({p}) => {
						expect(p.canAbort()).toBeFalse();
					});
				}
			});
		});
	});

	// TODO Tests for normal behaviour with valid iterables
	// TODO Test sync abort does not abort promises which are already followed elsewhere

	describe('when passed non-iterable', () => {
		runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
			const itWithSetup = createItWithSetupAndTeardown({
				setup() {
					const p = PromiseOrAbortable.all(undefined);
					return {p};
				},
				async teardown({p}) {
					await p.catch(() => {});
				}
			});

			describe(`returns ${className} which is`, () => {
				itWithSetup(`${className} class instance`, ({p}) => {
					expect(p).toBeInstanceOf(PromiseOrAbortable);
				});

				itWithSetup('already rejected', ({p}) => {
					expect(p).toBeRejectedPromise();
				});

				itWithSetup('rejected with TypeError', async ({p}) => {
					const err = await getRejectionReason(p);
					expect(err).toBeInstanceOf(TypeError);
					expect(err.message).toBe(
						isAbortable // eslint-disable-line no-nested-ternary
							? 'iterable is not iterable'
							: isNode10
								? "Cannot read property 'Symbol(Symbol.iterator)' of undefined"
								: 'undefined is not iterable (cannot read property Symbol(Symbol.iterator))'
					);
				});

				if (isAbortable) {
					itWithSetup('not abortable', ({p}) => {
						expect(p.canAbort()).toBeFalse();
					});
				}
			});
		});
	});

	describe('when passed non-iterable object', () => {
		runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
			const itWithSetup = createItWithSetupAndTeardown({
				setup() {
					const p = PromiseOrAbortable.all({});
					return {p};
				},
				async teardown({p}) {
					await p.catch(() => {});
				}
			});

			describe(`returns ${className} which is`, () => {
				itWithSetup(`${className} class instance`, ({p}) => {
					expect(p).toBeInstanceOf(PromiseOrAbortable);
				});

				itWithSetup('already rejected', ({p}) => {
					expect(p).toBeRejectedPromise();
				});

				itWithSetup('rejected with TypeError', async ({p}) => {
					const err = await getRejectionReason(p);
					expect(err).toBeInstanceOf(TypeError);
					expect(err.message).toBe(
						isAbortable // eslint-disable-line no-nested-ternary
							? 'iterable is not iterable'
							: isNode10
								? '#<Object> is not iterable'
								: 'object is not iterable (cannot read property Symbol(Symbol.iterator))'
					);
				});

				if (isAbortable) {
					itWithSetup('not abortable', ({p}) => {
						expect(p.canAbort()).toBeFalse();
					});
				}
			});
		});
	});

	describe('when passed iterable with `[Symbol.iterator]()` method that returns invalid iterator', () => {
		runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
			const itWithSetup = createItWithSetupAndTeardown({
				setup() {
					const iterable = {
						[Symbol.iterator]() {
							return {};
						}
					};
					const p = PromiseOrAbortable.all(iterable);
					return {p};
				},
				async teardown({p}) {
					await p.catch(() => {});
				}
			});

			describe(`returns ${className} which is`, () => {
				itWithSetup(`${className} class instance`, ({p}) => {
					expect(p).toBeInstanceOf(PromiseOrAbortable);
				});

				itWithSetup('already rejected', ({p}) => {
					expect(p).toBeRejectedPromise();
				});

				itWithSetup('rejected with TypeError', async ({p}) => {
					const err = await getRejectionReason(p);
					expect(err).toBeInstanceOf(TypeError);
					expect(err.message).toBe('undefined is not a function');
				});

				if (isAbortable) {
					itWithSetup('not abortable', ({p}) => {
						expect(p.canAbort()).toBeFalse();
					});
				}
			});
		});
	});

	describe('when passed iterable with `[Symbol.iterator]()` method that throws', () => {
		runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
			const itWithSetup = createItWithSetupAndTeardown({
				setup() {
					const err = new Error('iterator error');
					const iterable = {
						[Symbol.iterator]() {
							throw err;
						}
					};
					const p = PromiseOrAbortable.all(iterable);
					return {p, expectedErr: err};
				},
				async teardown({p}) {
					await p.catch(() => {});
				}
			});

			describe(`returns ${className} which is`, () => {
				itWithSetup(`${className} class instance`, ({p}) => {
					expect(p).toBeInstanceOf(PromiseOrAbortable);
				});

				itWithSetup('already rejected', ({p}) => {
					expect(p).toBeRejectedPromise();
				});

				itWithSetup('rejected with thrown error', async ({p, expectedErr}) => {
					const err = await getRejectionReason(p);
					expect(err).toBe(expectedErr);
				});

				if (isAbortable) {
					itWithSetup('not abortable', ({p}) => {
						expect(p.canAbort()).toBeFalse();
					});
				}
			});
		});
	});

	describe('when passed iterable returning iterator with `.next()` method that returns invalid value', () => {
		describe('on first iteration', () => {
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

		describe('on later iteration', () => {
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
			runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const iterable = createIterable();
						const p = PromiseOrAbortable.all(iterable);
						return {p};
					},
					async teardown({p}) {
						await p.catch(() => {});
					}
				});

				describe(`returns ${className} which is`, () => {
					itWithSetup(`${className} class instance`, ({p}) => {
						expect(p).toBeInstanceOf(PromiseOrAbortable);
					});

					itWithSetup('already rejected', ({p}) => {
						expect(p).toBeRejectedPromise();
					});

					itWithSetup('rejected with TypeError', async ({p}) => {
						const err = await getRejectionReason(p);
						expect(err).toBeInstanceOf(TypeError);
						expect(err.message).toBe('Iterator result undefined is not an object');
					});

					if (isAbortable) {
						itWithSetup('not abortable', ({p}) => {
							expect(p.canAbort()).toBeFalse();
						});
					}
				});
			});
		}
	});

	describe('when passed iterable returning iterator with `.next()` method that throws', () => {
		describe('on first iteration, returns Abortable which is', () => {
			runTests(() => {
				const err = new Error('next error');
				const iterable = {
					[Symbol.iterator]() {
						return {
							next() {
								throw err;
							}
						};
					}
				};
				return {iterable, err};
			});
		});

		describe('on later iteration, returns Abortable which is', () => {
			runTests(() => {
				const err = new Error('next error');
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
				return {iterable, err};
			});
		});

		function runTests(createIterableAndError) {
			runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const {iterable, err} = createIterableAndError();
						const p = PromiseOrAbortable.all(iterable);
						return {p, expectedErr: err};
					},
					async teardown({p}) {
						await p.catch(() => {});
					}
				});

				describe(`returns ${className} which is`, () => {
					itWithSetup(`${className} class instance`, ({p}) => {
						expect(p).toBeInstanceOf(PromiseOrAbortable);
					});

					itWithSetup('already rejected', ({p}) => {
						expect(p).toBeRejectedPromise();
					});

					itWithSetup('rejected with thrown error', async ({p, expectedErr}) => {
						const err = await getRejectionReason(p);
						expect(err).toBe(expectedErr);
					});

					if (isAbortable) {
						itWithSetup('not abortable', ({p}) => {
							expect(p.canAbort()).toBeFalse();
						});
					}
				});
			});
		}
	});

	describe('when thenable getter for `.then` property throws', () => {
		describe('on first iteration', () => {
			runTests(() => {
				const err = new Error('then getter error');
				const finalThen = spy(() => {});
				const iterable = [
					{get then() { throw err; }},
					2,
					3,
					4,
					5,
					{then: finalThen}
				];
				return {err, iterable, finalThen};
			});
		});

		describe('on later iteration', () => {
			runTests(() => {
				const err = new Error('then getter error');
				const finalThen = spy(() => {});
				const iterable = [
					1,
					2,
					{get then() { throw err; }},
					4,
					5,
					{then: finalThen}
				];
				return {err, iterable, finalThen};
			});
		});

		function runTests(createIterableAndError) {
			runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const {err, iterable, finalThen} = createIterableAndError();
						const p = PromiseOrAbortable.all(iterable);
						return {p, expectedErr: err, finalThen};
					},
					async teardown({p}) {
						await p.catch(() => {});
					}
				});

				describe(`returns ${className} which is`, () => {
					itWithSetup(`${className} instance`, ({p}) => {
						expect(p).toBeInstanceOf(PromiseOrAbortable);
					});

					itWithSetup('pending', ({p}) => {
						expect(p).toBePendingPromise();
					});

					itWithSetup('rejected with thrown error', async ({p, expectedErr}) => {
						const err = await getRejectionReason(p);
						expect(err).toBe(expectedErr);
					});

					if (isAbortable) {
						itWithSetup('abortable', ({p}) => {
							expect(p.canAbort()).toBeTrue();
						});
					}
				});

				itWithSetup('continues iteration', async ({p, finalThen}) => {
					noUnhandledRejection(p);
					await tick();
					expect(finalThen).toHaveBeenCalledTimes(1);
				});
			});
		}
	});

	describe('when thenable `.then()` method throws', () => {
		describe('on first iteration', () => {
			runTests(() => {
				const err = new Error('then error');
				const finalThen = spy(() => {});
				const iterable = [
					{then() { throw err; }},
					2,
					3,
					4,
					5,
					{then: finalThen}
				];
				return {err, iterable, finalThen};
			});
		});

		describe('on later iteration', () => {
			runTests(() => {
				const err = new Error('then error');
				const finalThen = spy(() => {});
				const iterable = [
					1,
					2,
					{then() { throw err; }},
					4,
					5,
					{then: finalThen}
				];
				return {err, iterable, finalThen};
			});
		});

		function runTests(createIterableAndError) {
			runTestsWithAbortableAndPromise(({PromiseOrAbortable, className, isAbortable}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const {err, iterable, finalThen} = createIterableAndError();
						const p = PromiseOrAbortable.all(iterable);
						return {p, expectedErr: err, finalThen};
					},
					async teardown({p}) {
						await p.catch(() => {});
					}
				});

				describe(`returns ${className} which is`, () => {
					itWithSetup(`${className} instance`, ({p}) => {
						expect(p).toBeInstanceOf(PromiseOrAbortable);
					});

					itWithSetup('pending', ({p}) => {
						expect(p).toBePendingPromise();
					});

					itWithSetup('rejected with thrown error', async ({p, expectedErr}) => {
						const err = await getRejectionReason(p);
						expect(err).toBe(expectedErr);
					});

					if (isAbortable) {
						itWithSetup('abortable', ({p}) => {
							expect(p.canAbort()).toBeTrue();
						});
					}
				});

				itWithSetup('continues iteration', async ({p, finalThen}) => {
					noUnhandledRejection(p);
					await tick();
					expect(finalThen).toHaveBeenCalledTimes(1);
				});
			});
		}
	});

	// TODO Tests for thenables with getter on `.abort` property which throws
	// TODO Tests for thenables with getter on `[IS_ABORTABLE]` property which throws
	// TODO Tests that `.then` getter called only once
	// TODO Tests that `.then()` called only once
	// TODO Tests for timing for thenables which call callback async

	describe('timing', () => {
		runTestsWithAbortableAndPromise(({PromiseOrAbortable}) => {
			it('runs in sequence', async () => {
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
		});
	});
});
