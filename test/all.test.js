/* --------------------
 * abortable module
 * Tests for `Abortable.all()`
 * ------------------*/

'use strict';

// eslint-disable-next-line max-len
/* eslint jest/no-standalone-expect: ["error", { "additionalTestBlockFunctions": ["itWithSetup", "itWithSetup.skip"] }] */

// Modules
const {AbortError} = require('abortable');

// Imports
const {
	describeAbortableAndPromiseWithAwaitOption, createItWithSetupAndTeardown,
	noUnhandledRejection, getRejectionReason, promiseStatus, tick, microtick, spy, isNode10
} = require('./support/utils.js');

// Init
require('./support/index.js');

// Tests

describe('Abortable.all', () => {
	// TODO Tests for normal behaviour with valid iterables
	// TODO Test sync abort does not abort promises which are already followed elsewhere

	describe('when passed array of Promises', () => {
		describe('which are already resolved', () => {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const arr = [1, 2, 3];
							const iterable = arr.map(n => Promise.resolve(n));
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							return {p, arr};
						},
						teardown: ({p}) => p
					});

					describe(`returns ${className} which is`, () => {
						itWithSetup(`${className} class instance`, ({p}) => {
							expect(p).toBeInstanceOf(PromiseOrAbortable);
						});

						itWithSetup('pending', ({p}) => {
							expect(p).toBePendingPromise();
						});

						// Skipping this test as Abortable's behavior is not exactly the same as Promise's.
						// Promise will resolve in this case after 1 microtick, whereas Abortable takes 2 microticks.
						// It's impossible for Abortable to mimic Promise's behavior perfectly in this case,
						// as it cannot determine synchronously whether promises are resolved or not.
						// `.then()` handlers are not called until after 1 microtick (matching Promise's behavior)
						// and then the `.then()` callback is not called until another microtick has passed.
						// Could solve this by using V8 runtime functions to synchronously detect resolved promises,
						// but that seems like a bad idea.
						itWithSetup.skip('still pending after 1 microtick', async ({p}) => {
							await microtick(() => expect(p).toBePendingPromise());
						});

						itWithSetup('resolved before 2 microticks have passed', async ({p}) => {
							await microtick(2, () => expect(p).toBeResolvedPromise());
						});

						itWithSetup('resolved with array of promise resolution values', async ({p, arr}) => {
							const res = await p;
							expect(res).toEqual(arr);
						});

						if (isAbortable) {
							itWithSetup('abortable', ({p}) => {
								expect(p.canAbort()).toBeTrue();
							});

							itWithSetup('still abortable after 1 microtick', async ({p}) => {
								await microtick(() => expect(p.canAbort()).toBeTrue());
							});

							itWithSetup('not abortable after 2 microticks', async ({p}) => {
								await microtick(2, () => expect(p.canAbort()).toBeFalse());
							});
						}
					});
				}
			);
		});

		describe('which resolve outside Promise constructor', () => {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const arr = [1, 2, 3];
							const resolves = [];
							const iterable = arr.map(
								(n, i) => new Promise((resolve) => { resolves[i] = () => resolve(n); })
							);
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							const resolveAll = () => resolves.forEach(resolve => resolve());
							return {p, arr, resolves, resolveAll};
						},
						async teardown({p, resolveAll}) {
							resolveAll();
							await p;
						}
					});

					describe(`returns ${className} which is`, () => {
						itWithSetup(`${className} class instance`, ({p}) => {
							expect(p).toBeInstanceOf(PromiseOrAbortable);
						});

						itWithSetup('pending', ({p}) => {
							expect(p).toBePendingPromise();
						});

						itWithSetup('pending until all promises resolved', async ({p, resolves}) => {
							resolves[0]();
							resolves[1]();
							await tick();
							expect(p).toBePendingPromise();
							resolves[2]();
						});

						// Skipping this test as Abortable's behavior is not exactly the same as Promise's.
						// Promise resolves after 1 microtick, whereas Abortable resolves after 2 microticks.
						// It's impossible for Abortable to mimic Promise's behavior perfectly in this case.
						itWithSetup.skip(
							'if promises resolved sync, still pending 1 microticks after last promise resolved',
							async ({p, resolveAll}) => {
								resolveAll();
								expect(p).toBePendingPromise();
								await microtick(() => expect(p).toBePendingPromise());
							}
						);

						itWithSetup(
							'if promises resolved sync, resolved before 2 microticks have passed after last promise resolved',
							async ({p, resolveAll}) => {
								resolveAll();
								expect(p).toBePendingPromise();
								await microtick(2, () => expect(p).toBeResolvedPromise());
							}
						);

						itWithSetup(
							'if promises resolved async, resolved 1 microtick after last promise resolved',
							async ({p, resolves}) => {
								resolves[0]();
								resolves[1]();
								await tick();
								expect(p).toBePendingPromise();
								resolves[2]();
								expect(p).toBePendingPromise();
								await microtick(() => expect(p).toBeResolvedPromise());
							}
						);

						itWithSetup(
							'resolved with array of promise resolution values',
							async ({p, resolveAll, arr}) => {
								resolveAll();
								const res = await p;
								expect(res).toEqual(arr);
							}
						);

						if (isAbortable) {
							itWithSetup('abortable', ({p}) => {
								expect(p.canAbort()).toBeTrue();
							});

							itWithSetup(
								'if promises resolved sync, still abortable after all promises resolved',
								({p, resolveAll}) => {
									resolveAll();
									expect(p.canAbort()).toBeTrue();
								}
							);

							itWithSetup(
								'if promises resolved sync, still abortable 1 microtick after all promises resolved',
								async ({p, resolveAll}) => {
									resolveAll();
									await microtick(() => expect(p.canAbort()).toBeTrue());
								}
							);

							itWithSetup(
								'if promises resolved sync, not abortable 2 microticks after all promises resolved',
								async ({p, resolveAll}) => {
									resolveAll();
									await microtick(2, () => expect(p.canAbort()).toBeFalse());
								}
							);

							itWithSetup(
								'if promises resolved async, still abortable after all promises resolved',
								async ({p, resolveAll}) => {
									await tick();
									resolveAll();
									expect(p.canAbort()).toBeTrue();
								}
							);

							itWithSetup(
								'if promises resolved async, not abortable 1 microtick after all promises resolved',
								async ({p, resolveAll}) => {
									await tick();
									resolveAll();
									await microtick(() => expect(p.canAbort()).toBeFalse());
								}
							);
						}
					});
				}
			);
		});

		// TODO Tests for rejections
	});

	describe('when passed array of thenables', () => {
		describe('which resolve synchronously', () => {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const arr = [1, 2, 3];
							const iterable = arr.map(n => ({
								then(resolve) {
									resolve(n);
								}
							}));
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							return {p, arr};
						},
						teardown: ({p}) => p
					});

					describe(`returns ${className} which is`, () => {
						itWithSetup(`${className} class instance`, ({p}) => {
							expect(p).toBeInstanceOf(PromiseOrAbortable);
						});

						itWithSetup('pending', ({p}) => {
							expect(p).toBePendingPromise();
						});

						itWithSetup('still pending after 1 microtick', async ({p}) => {
							await microtick(() => expect(p).toBePendingPromise());
						});

						itWithSetup('resolved before 2 microticks have passed', async ({p}) => {
							await microtick(2, () => expect(p).toBeResolvedPromise());
						});

						itWithSetup('resolved with array of promise resolution values', async ({p, arr}) => {
							const res = await p;
							expect(res).toEqual(arr);
						});

						if (isAbortable) {
							itWithSetup('abortable', ({p}) => {
								expect(p.canAbort()).toBeTrue();
							});
						}
					});
				}
			);
		});

		describe('which resolve asynchronously', () => {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const arr = [1, 2, 3];
							const resolves = [];
							const iterable = arr.map((n, i) => ({
								then(resolve) {
									resolves[i] = () => resolve(n);
								}
							}));
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							const resolveAll = () => resolves.forEach(resolve => resolve());
							return {p, arr, resolves, resolveAll};
						},
						async teardown({p, resolveAll}) {
							await tick();
							resolveAll();
							await p;
						}
					});

					describe(`returns ${className} which is`, () => {
						itWithSetup(`${className} class instance`, ({p}) => {
							expect(p).toBeInstanceOf(PromiseOrAbortable);
						});

						itWithSetup('pending', ({p}) => {
							expect(p).toBePendingPromise();
						});

						itWithSetup('pending until all promises resolved', async ({p, resolves}) => {
							await tick();
							resolves[0]();
							resolves[1]();
							await tick();
							expect(p).toBePendingPromise();
							resolves[2]();
						});

						itWithSetup('resolved 1 microtick after last promise resolved', async ({p, resolves}) => {
							await tick();
							resolves[0]();
							resolves[1]();
							await tick();
							expect(p).toBePendingPromise();
							resolves[2]();
							expect(p).toBePendingPromise();
							await microtick(() => expect(p).toBeResolvedPromise());
						});

						itWithSetup(
							'resolved with array of promise resolution values',
							async ({p, resolveAll, arr}) => {
								await tick();
								resolveAll();
								const res = await p;
								expect(res).toEqual(arr);
							}
						);

						if (isAbortable) {
							itWithSetup('abortable', ({p}) => {
								expect(p.canAbort()).toBeTrue();
							});

							itWithSetup('still abortable after all promises resolved', async ({p, resolveAll}) => {
								await tick();
								resolveAll();
								expect(p.canAbort()).toBeTrue();
							});

							itWithSetup(
								'not abortable 1 microtick after all promises resolved',
								async ({p, resolveAll}) => {
									await tick();
									resolveAll();
									await microtick(() => expect(p.canAbort()).toBeFalse());
								}
							);
						}
					});
				}
			);
		});

		// TODO Tests for rejections
	});

	describe('when passed array of literals', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const arr = [1, 2, 3];
						const p = awaitAll
							? PromiseOrAbortable.all(arr, {await: true})
							: PromiseOrAbortable.all(arr);
						return {p, arr};
					},
					teardown: ({p}) => p
				});

				describe(`returns ${className} which is`, () => {
					itWithSetup(`${className} class instance`, ({p}) => {
						expect(p).toBeInstanceOf(PromiseOrAbortable);
					});

					itWithSetup('pending', ({p}) => {
						expect(p).toBePendingPromise();
					});

					itWithSetup('resolved after 1 microtick', async ({p}) => {
						await microtick(() => expect(p).toBeResolvedPromise());
					});

					itWithSetup('resolved with array of inputs', async ({p, arr}) => {
						const res = await p;
						expect(res).toEqual(arr);
						expect(res).not.toBe(arr);
					});

					if (isAbortable) {
						itWithSetup('abortable', ({p}) => {
							expect(p.canAbort()).toBeTrue();
						});
					}
				});
			}
		);
	});

	describe('when passed array of non-thenable objects', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const arr = [{a: 1}, {b: 2}, {c: 3}];
						const p = awaitAll
							? PromiseOrAbortable.all(arr, {await: true})
							: PromiseOrAbortable.all(arr);
						return {p, arr};
					},
					teardown: ({p}) => p
				});

				describe(`returns ${className} which is`, () => {
					itWithSetup(`${className} class instance`, ({p}) => {
						expect(p).toBeInstanceOf(PromiseOrAbortable);
					});

					itWithSetup('pending', ({p}) => {
						expect(p).toBePendingPromise();
					});

					itWithSetup('resolved after 1 microtick', async ({p}) => {
						await microtick(() => expect(p).toBeResolvedPromise());
					});

					itWithSetup('resolved with array of inputs', async ({p, arr}) => {
						const res = await p;
						expect(res).toEqual(arr);
						expect(res).not.toBe(arr);
						expect(res[0]).toBe(arr[0]);
						expect(res[1]).toBe(arr[1]);
						expect(res[2]).toBe(arr[2]);
					});

					if (isAbortable) {
						itWithSetup('abortable', ({p}) => {
							expect(p.canAbort()).toBeTrue();
						});
					}
				});
			}
		);
	});

	describe('when passed empty array', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const p = awaitAll
							? PromiseOrAbortable.all([], {await: true})
							: PromiseOrAbortable.all([]);
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
			}
		);
	});

	describe('when passed non-iterable', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const p = awaitAll
							? PromiseOrAbortable.all(undefined, {await: true})
							: PromiseOrAbortable.all(undefined);
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
			}
		);
	});

	describe('when passed non-iterable object', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const p = awaitAll
							? PromiseOrAbortable.all({}, {await: true})
							: PromiseOrAbortable.all({});
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
			}
		);
	});

	describe('when passed iterable with `[Symbol.iterator]()` method that returns invalid iterator', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const iterable = {
							[Symbol.iterator]() {
								return {};
							}
						};
						const p = awaitAll
							? PromiseOrAbortable.all(iterable, {await: true})
							: PromiseOrAbortable.all(iterable);
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
			}
		);
	});

	describe('when passed iterable with `[Symbol.iterator]()` method that throws', () => {
		describeAbortableAndPromiseWithAwaitOption(
			({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
				const itWithSetup = createItWithSetupAndTeardown({
					setup() {
						const err = new Error('iterator error');
						const iterable = {
							[Symbol.iterator]() {
								throw err;
							}
						};
						const p = awaitAll
							? PromiseOrAbortable.all(iterable, {await: true})
							: PromiseOrAbortable.all(iterable);
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
			}
		);
	});

	describe('when passed iterable returning iterator with `.next()` method that returns invalid value', () => {
		describe('on first iteration', () => {
			runTests(
				() => {
					const iterable = {
						[Symbol.iterator]() {
							return {
								next() {
									return undefined;
								}
							};
						}
					};
					return {iterable, thenables: []};
				},
				false
			);
		});

		describe('on later iteration', () => {
			runTests(
				() => {
					const thenables = [];
					const iterable = {
						[Symbol.iterator]() {
							let count = 0;
							return {
								next() {
									if (count === 3) return undefined;
									count++;

									const thenableWithResolve = {
										then: spy((resolve) => { thenableWithResolve.resolve = resolve; }),
										abort: spy(),
										resolve: undefined
									};
									thenables.push(thenableWithResolve);
									return {
										value: {then: thenableWithResolve.then, abort: thenableWithResolve.abort},
										done: false
									};
								}
							};
						}
					};
					return {iterable, thenables};
				},
				true
			);
		});

		function runTests(createIterable, throwsOnLaterIteration) {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const {iterable, thenables} = createIterable();
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							const resolveAll = () => thenables.forEach(thenable => thenable.resolve());
							return {p, thenables, resolveAll};
						},
						async teardown({p, resolveAll}) {
							noUnhandledRejection(p);
							await tick();
							resolveAll();
							await p.catch(() => {});
						}
					});

					describe(`returns ${className} which is`, () => {
						itWithSetup(`${className} class instance`, ({p}) => {
							expect(p).toBeInstanceOf(PromiseOrAbortable);
						});

						if (!throwsOnLaterIteration || !awaitAll) {
							itWithSetup('already rejected', ({p}) => {
								expect(p).toBeRejectedPromise();
							});
						} else {
							itWithSetup('pending', ({p}) => {
								expect(p).toBePendingPromise();
							});

							itWithSetup(
								'not rejected until 1 microtick after all promises resolved',
								async ({p, thenables}) => {
									noUnhandledRejection(p);
									await tick();
									expect(thenables).toHaveLength(3);

									thenables[0].resolve();
									thenables[1].resolve();
									await tick();
									expect(p).toBePendingPromise();
									thenables[2].resolve();
									expect(p).toBePendingPromise();
									await microtick(() => expect(p).toBeRejectedPromise());
								}
							);
						}

						itWithSetup('rejected with TypeError', async ({p, resolveAll}) => {
							noUnhandledRejection(p);
							await tick();
							resolveAll();

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

					if (throwsOnLaterIteration) {
						describe('calls', () => {
							itWithSetup('`.then()` on earlier thenables', async ({p, thenables}) => {
								noUnhandledRejection(p);
								await tick();
								for (const thenable of thenables) {
									expect(thenable.then).toHaveBeenCalledTimes(1);
								}
							});

							if (isAbortable) {
								itWithSetup('`.abort()` on earlier thenables', async ({p, thenables}) => {
									noUnhandledRejection(p);
									await tick();
									for (const thenable of thenables) {
										expect(thenable.abort).toHaveBeenCalledTimes(1);
										const abortErr = thenable.abort.mock.calls[0][0];
										expect(abortErr).toBeInstanceOf(AbortError);
										expect(abortErr.message).toBe('Abort due to collection completion');
									}
								});
							}
						});
					}
				}
			);
		}
	});

	describe('when passed iterable returning iterator with `.next()` method that throws', () => {
		describe('on first iteration', () => {
			runTests(
				() => {
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
					return {iterable, err, thenables: []};
				},
				false
			);
		});

		describe('on later iteration', () => {
			runTests(
				() => {
					const err = new Error('next error'),
						thenables = [];
					const iterable = {
						[Symbol.iterator]() {
							let count = 0;
							return {
								next() {
									if (count === 3) throw err;
									count++;

									const thenableWithResolve = {
										then: spy((resolve) => { thenableWithResolve.resolve = resolve; }),
										abort: spy(),
										resolve: undefined
									};
									thenables.push(thenableWithResolve);
									return {
										value: {then: thenableWithResolve.then, abort: thenableWithResolve.abort},
										done: false
									};
								}
							};
						}
					};
					return {iterable, err, thenables};
				},
				true
			);
		});

		function runTests(createIterable, throwsOnLaterIteration) {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const {iterable, err, thenables} = createIterable();
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							const resolveAll = () => thenables.forEach(thenable => thenable.resolve());
							return {p, expectedErr: err, thenables, resolveAll};
						},
						async teardown({p, resolveAll}) {
							noUnhandledRejection(p);
							await tick();
							resolveAll();
							await p.catch(() => {});
						}
					});

					describe(`returns ${className} which is`, () => {
						itWithSetup(`${className} class instance`, ({p}) => {
							expect(p).toBeInstanceOf(PromiseOrAbortable);
						});

						if (!throwsOnLaterIteration || !awaitAll) {
							itWithSetup('already rejected', ({p}) => {
								expect(p).toBeRejectedPromise();
							});
						} else {
							itWithSetup('pending', ({p}) => {
								expect(p).toBePendingPromise();
							});

							itWithSetup(
								'not rejected until 1 microtick after all promises resolved',
								async ({p, thenables}) => {
									noUnhandledRejection(p);
									await tick();
									expect(thenables).toHaveLength(3);

									thenables[0].resolve();
									thenables[1].resolve();
									await tick();
									expect(p).toBePendingPromise();
									thenables[2].resolve();
									expect(p).toBePendingPromise();
									await microtick(() => expect(p).toBeRejectedPromise());
								}
							);
						}

						itWithSetup('rejected with thrown error', async ({p, expectedErr, resolveAll}) => {
							noUnhandledRejection(p);
							await tick();
							resolveAll();

							const err = await getRejectionReason(p);
							expect(err).toBe(expectedErr);
						});

						if (isAbortable) {
							itWithSetup('not abortable', ({p}) => {
								expect(p.canAbort()).toBeFalse();
							});
						}
					});

					if (throwsOnLaterIteration) {
						describe('calls', () => {
							itWithSetup('`.then()` on earlier thenables', async ({p, thenables}) => {
								noUnhandledRejection(p);
								await tick();
								for (const thenable of thenables) {
									expect(thenable.then).toHaveBeenCalledTimes(1);
								}
							});

							if (isAbortable) {
								itWithSetup('`.abort()` on earlier thenables', async ({p, thenables}) => {
									noUnhandledRejection(p);
									await tick();
									for (const thenable of thenables) {
										expect(thenable.abort).toHaveBeenCalledTimes(1);
										const abortErr = thenable.abort.mock.calls[0][0];
										expect(abortErr).toBeInstanceOf(AbortError);
										expect(abortErr.message).toBe('Abort due to collection completion');
									}
								});
							}
						});
					}
				}
			);
		}
	});

	describe('when thenable getter for `.then` property throws', () => {
		describe('on first iteration', () => {
			runTests(() => {
				const err = new Error('then getter error'),
					thenables = [];
				const createThenable = () => {
					const thenableWithResolve = {
						then: spy((resolve) => { thenableWithResolve.resolve = resolve; }),
						abort: spy(),
						resolve: undefined
					};
					thenables.push(thenableWithResolve);
					return {then: thenableWithResolve.then, abort: thenableWithResolve.abort};
				};

				const iterable = [
					{get then() { throw err; }},
					createThenable(),
					createThenable(),
					createThenable(),
					createThenable()
				];
				return {iterable, err, thenables};
			});
		});

		describe('on later iteration', () => {
			runTests(() => {
				const err = new Error('then getter error'),
					thenables = [];
				const createThenable = () => {
					const thenableWithResolve = {
						then: spy((resolve) => { thenableWithResolve.resolve = resolve; }),
						abort: spy(),
						resolve: undefined
					};
					thenables.push(thenableWithResolve);
					return {then: thenableWithResolve.then, abort: thenableWithResolve.abort};
				};

				const iterable = [
					createThenable(),
					createThenable(),
					{get then() { throw err; }},
					createThenable(),
					createThenable()
				];
				return {iterable, err, thenables};
			});
		});

		function runTests(createIterable) {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const {iterable, err, thenables} = createIterable();
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							const resolveAll = () => thenables.forEach(thenable => thenable.resolve());
							return {p, expectedErr: err, thenables, resolveAll};
						},
						async teardown({p, resolveAll}) {
							noUnhandledRejection(p);
							await tick();
							resolveAll();
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

						if (!awaitAll) {
							itWithSetup('rejects after 1 microtick', async ({p}) => {
								await microtick(() => expect(p).toBeRejectedPromise());
							});
						} else {
							itWithSetup(
								'does not reject until 1 microtick after all promises resolved',
								async ({p, thenables}) => {
									noUnhandledRejection(p);
									await tick();
									expect(thenables).toHaveLength(4);

									thenables[0].resolve();
									thenables[1].resolve();
									thenables[2].resolve();
									await tick();
									expect(p).toBePendingPromise();
									thenables[3].resolve();
									expect(p).toBePendingPromise();
									await microtick(() => expect(p).toBeRejectedPromise());
								}
							);
						}

						itWithSetup('rejected with thrown error', async ({p, expectedErr, resolveAll}) => {
							noUnhandledRejection(p);
							await tick();
							resolveAll();

							const err = await getRejectionReason(p);
							expect(err).toBe(expectedErr);
						});

						if (isAbortable) {
							itWithSetup('abortable', ({p}) => {
								expect(p.canAbort()).toBeTrue();
							});

							itWithSetup('not abortable after 1 microtick', async ({p}) => {
								await microtick(() => expect(p.canAbort()).toBeFalse());
							});
						}
					});

					describe('calls', () => {
						itWithSetup('`.then()` on all thenables', async ({p, thenables}) => {
							noUnhandledRejection(p);
							await tick();
							for (const thenable of thenables) {
								expect(thenable.then).toHaveBeenCalledTimes(1);
							}
						});

						if (isAbortable) {
							itWithSetup('`.abort()` on all thenables', async ({p, thenables}) => {
								noUnhandledRejection(p);
								await tick();
								for (const thenable of thenables) {
									expect(thenable.abort).toHaveBeenCalledTimes(1);
									const abortErr = thenable.abort.mock.calls[0][0];
									expect(abortErr).toBeInstanceOf(AbortError);
									expect(abortErr.message).toBe('Abort due to collection completion');
								}
							});
						}
					});
				}
			);
		}
	});

	describe('when thenable `.then()` method throws', () => {
		describe('on first iteration', () => {
			runTests(() => {
				const err = new Error('then error'),
					thenables = [];
				const createThenable = () => {
					const thenableWithResolve = {
						then: spy((resolve) => { thenableWithResolve.resolve = resolve; }),
						abort: spy(),
						resolve: undefined
					};
					thenables.push(thenableWithResolve);
					return {then: thenableWithResolve.then, abort: thenableWithResolve.abort};
				};

				const iterable = [
					{then() { throw err; }},
					createThenable(),
					createThenable(),
					createThenable(),
					createThenable()
				];
				return {iterable, err, thenables};
			});
		});

		describe('on later iteration', () => {
			runTests(() => {
				const err = new Error('then error'),
					thenables = [];
				const createThenable = () => {
					const thenableWithResolve = {
						then: spy((resolve) => { thenableWithResolve.resolve = resolve; }),
						abort: spy(),
						resolve: undefined
					};
					thenables.push(thenableWithResolve);
					return {then: thenableWithResolve.then, abort: thenableWithResolve.abort};
				};

				const iterable = [
					createThenable(),
					createThenable(),
					{then() { throw err; }},
					createThenable(),
					createThenable()
				];
				return {iterable, err, thenables};
			});
		});

		function runTests(createIterable) {
			describeAbortableAndPromiseWithAwaitOption(
				({PromiseOrAbortable, className, isAbortable, awaitAll}) => {
					const itWithSetup = createItWithSetupAndTeardown({
						setup() {
							const {iterable, err, thenables} = createIterable();
							const p = awaitAll
								? PromiseOrAbortable.all(iterable, {await: true})
								: PromiseOrAbortable.all(iterable);
							const resolveAll = () => thenables.forEach(thenable => thenable.resolve());
							return {p, expectedErr: err, thenables, resolveAll};
						},
						async teardown({p, resolveAll}) {
							noUnhandledRejection(p);
							await tick();
							resolveAll();
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

						if (!awaitAll) {
							itWithSetup('still pending after 1 microtick', async ({p}) => {
								await microtick(() => expect(p).toBePendingPromise());
							});

							itWithSetup('rejected after 2 microticks', async ({p}) => {
								await microtick(2, () => expect(p).toBeRejectedPromise());
							});
						} else {
							itWithSetup(
								'does not reject until 1 microtick after all promises resolved',
								async ({p, thenables}) => {
									noUnhandledRejection(p);
									await tick();
									expect(thenables).toHaveLength(4);

									thenables[0].resolve();
									thenables[1].resolve();
									thenables[2].resolve();
									await tick();
									expect(p).toBePendingPromise();
									thenables[3].resolve();
									expect(p).toBePendingPromise();
									await microtick(() => expect(p).toBeRejectedPromise());
								}
							);
						}

						itWithSetup('rejected with thrown error', async ({p, expectedErr, resolveAll}) => {
							noUnhandledRejection(p);
							await tick();
							resolveAll();

							const err = await getRejectionReason(p);
							expect(err).toBe(expectedErr);
						});

						if (isAbortable) {
							itWithSetup('abortable', ({p}) => {
								expect(p.canAbort()).toBeTrue();
							});

							itWithSetup('still abortable after 1 microtick', async ({p}) => {
								await microtick(() => expect(p.canAbort()).toBeTrue());
							});

							itWithSetup('not abortable after 2 microticks', async ({p}) => {
								await microtick(2, () => expect(p.canAbort()).toBeFalse());
							});
						}
					});

					describe('calls', () => {
						itWithSetup('`.then()` on all thenables', async ({p, thenables}) => {
							noUnhandledRejection(p);
							await tick();
							for (const thenable of thenables) {
								expect(thenable.then).toHaveBeenCalledTimes(1);
							}
						});

						if (isAbortable) {
							itWithSetup('`.abort()` on all thenables', async ({p, thenables}) => {
								noUnhandledRejection(p);
								await tick();
								for (const thenable of thenables) {
									expect(thenable.abort).toHaveBeenCalledTimes(1);
									const abortErr = thenable.abort.mock.calls[0][0];
									expect(abortErr).toBeInstanceOf(AbortError);
									expect(abortErr.message).toBe('Abort due to collection completion');
								}
							});
						}
					});
				}
			);
		}
	});

	// TODO Tests for thenables with getter on `.abort` property which throws
	// TODO Tests for thenables with getter on `[IS_ABORTABLE]` property which throws
	// TODO Tests that `.then` getter called only once
	// TODO Tests that `.then()` called only once
	// TODO Tests for timing for thenables which call callback async

	describe('timing', () => {
		describeAbortableAndPromiseWithAwaitOption(({PromiseOrAbortable, awaitAll}) => {
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

				microtick(() => called('before microtick'));

				const p = awaitAll
					? PromiseOrAbortable.all(iterable, {await: true})
					: PromiseOrAbortable.all(iterable);
				called('sync');

				const pTick1 = microtick(() => called(`after microtick = ${promiseStatus(p)}`));
				const pTick2 = microtick(2, () => called(`after 2 microticks = ${promiseStatus(p)}`));
				await Promise.all([pTick1, pTick2, p]);

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
