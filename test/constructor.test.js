/* --------------------
 * abortable module
 * Tests for Abortable constructor
 * ------------------*/

'use strict';

// Modules
const Abortable = require('../index');

// Init
const {spy, tryCatch, tick, noUnhandledRejection} = require('./utils');

// Tests

describe('new Abortable()', () => {
	it('calls executor once', () => {
		const exec = spy();
		new Abortable(exec); // eslint-disable-line no-new
		expect(exec).toHaveBeenCalledTimes(1);
	});

	it('calls executor with 3 arguments', () => {
		let args;
		new Abortable((..._args) => { args = _args; }); // eslint-disable-line no-new

		expect(args).toHaveLength(3);
		expect(args[0]).toBeFunction();
		expect(args[1]).toBeFunction();
		expect(args[2]).toBeFunction();
	});

	it('creates Promise subclass instance', () => {
		const p = new Abortable(() => {});
		expect(p).toBeInstanceOf(Abortable);
		expect(p).toBeInstanceOf(Promise);
	});

	describe('throws same error as Promise constructor if executor is', () => {
		it('undefined', () => { // eslint-disable-line jest/expect-expect
			expectSameError();
		});

		it('null', () => { // eslint-disable-line jest/expect-expect
			expectSameError(null);
		});

		it('boolean', () => { // eslint-disable-line jest/expect-expect
			expectSameError(true);
		});

		it('string', () => { // eslint-disable-line jest/expect-expect
			expectSameError('abc');
		});

		it('number', () => { // eslint-disable-line jest/expect-expect
			expectSameError(123);
		});

		it('object', () => { // eslint-disable-line jest/expect-expect
			expectSameError({call() {}});
		});

		function expectSameError(value) {
			const err1 = tryCatch(() => new Promise(value));
			const err2 = tryCatch(() => new Abortable(value));
			expect(err1).toBeDefined();
			expect(err2).toBeDefined();
			expect(err2.name).toBe(err1.name);
			expect(err2.message).toBe(err1.message);
		}
	});

	it('calls .then resolve handler if resolve() called', async () => {
		let resolve;
		const p = new Abortable((_resolve) => { resolve = _resolve; });
		const resolveHandler = spy(),
			rejectHandler = spy();
		p.then(resolveHandler, rejectHandler);

		await tick();
		expect(resolveHandler).not.toHaveBeenCalled();

		resolve(123);
		await tick();
		expect(resolveHandler).toHaveBeenCalledTimes(1);
		expect(resolveHandler).toHaveBeenCalledWith(123);
		expect(rejectHandler).not.toHaveBeenCalled();
	});

	it('calls .then reject handler if reject() called', async () => {
		let reject;
		const p = new Abortable((_resolve, _reject) => { reject = _reject; });
		const resolveHandler = spy(),
			rejectHandler = spy();
		p.then(resolveHandler, rejectHandler);

		await tick();
		expect(rejectHandler).not.toHaveBeenCalled();

		const err = new Error('err');
		reject(err);
		await tick();
		expect(rejectHandler).toHaveBeenCalledTimes(1);
		expect(rejectHandler).toHaveBeenCalledWith(err);
		expect(resolveHandler).not.toHaveBeenCalled();
	});

	it('initially flagged as abortable', () => {
		const p = new Abortable(() => {});
		expect(p.canAbort()).toBe(true);
	});

	describe('flags promise as not abortable after', () => {
		it('resolve called', async () => {
			let resolve;
			const p = new Abortable((_resolve) => { resolve = _resolve; });
			expect(p.canAbort()).toBe(true);

			resolve();
			expect(p.canAbort()).toBe(false);

			await p;
		});

		it('reject called', async () => {
			let reject;
			const p = new Abortable((_resolve, _reject) => { reject = _reject; });
			expect(p.canAbort()).toBe(true);

			reject();
			expect(p.canAbort()).toBe(false);

			await p.catch(() => {});
		});
	});

	describe('clears state when', () => {
		let p, resolve, reject, onAbort;
		beforeEach(() => {
			p = new Abortable((_resolve, _reject, _onAbort) => {
				resolve = _resolve;
				reject = _reject;
				onAbort = _onAbort;
			});
			noUnhandledRejection(p);
		});

		describe('resolve() called', () => {
			afterEach(() => p);

			it('_abortHandler', async () => {
				const fn = () => {};
				onAbort(fn);

				expect(p._abortHandler).toBe(fn);
				resolve();
				expect(p._abortHandler).toBeUndefined();
			});

			it('_abortError', async () => {
				const err = new Error('err');
				p.abort(err);

				expect(p._abortError).toBe(err);
				resolve();
				expect(p._abortError).toBeUndefined();
			});
		});

		describe('reject() called', () => {
			afterEach(() => p.catch(() => {}));

			it('_abortHandler', async () => {
				const fn = () => {};
				onAbort(fn);

				expect(p._abortHandler).toBe(fn);
				reject();
				expect(p._abortHandler).toBeUndefined();
			});

			it('_abortError', async () => {
				const err = new Error('err');
				p.abort(err);

				expect(p._abortError).toBe(err);
				reject();
				expect(p._abortError).toBeUndefined();
			});
		});
	});

	describe('follows value resolve() called with when is', () => {
		describe('Abortable with resolve() called', () => { // eslint-disable-line jest/lowercase-name
			describe('inside constructor', () => {
				let p, onAbort,
					pInner, resolveInner, rejectInner;
				beforeEach(() => {
					pInner = new Abortable((_resolve, _reject) => {
						resolveInner = _resolve;
						rejectInner = _reject;
					});
					p = new Abortable((resolve, _reject, _onAbort) => {
						onAbort = _onAbort;
						resolve(pInner);
					});
				});

				it('does not flag promise as not abortable', () => {
					expect(p.canAbort()).toBe(true);
				});

				describe('does not record _abortHandler when onAbort() called', () => {
					describe('inside constructor and onAbort() called', () => {
						it('first', () => {
							p = new Abortable((resolve) => {
								onAbort(() => {});
								resolve(pInner);
							});

							expect(p._abortHandler).toBeUndefined();
						});

						it('last', () => {
							p = new Abortable((resolve) => {
								resolve(pInner);
								onAbort(() => {});
							});

							expect(p._abortHandler).toBeUndefined();
						});
					});

					it('outside constructor', () => {
						onAbort(() => {});
						expect(p._abortHandler).toBeUndefined();
					});
				});

				it('does not record _abortError', () => {
					p.abort();
					expect(p._abortError).toBeUndefined();
				});

				it('records following on original', () => {
					expect(p._awaiting).toBe(pInner);
				});

				it('records following on followed', () => {
					const {_followers} = pInner;
					expect(_followers).toBeArray();
					expect(_followers).toHaveLength(1);
					expect(_followers).toContain(p);
				});

				describe('when resolved', () => {
					afterEach(() => p);

					it('calls .then resolve handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(resolveHandler).not.toHaveBeenCalled();

						resolveInner(123);
						await tick();
						expect(resolveHandler).toHaveBeenCalledTimes(1);
						expect(resolveHandler).toHaveBeenCalledWith(123);
						expect(rejectHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBe(pInner);
						resolveInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						expect(pInner._followers).toBeArray();
						resolveInner();
						expect(pInner._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						resolveInner();
						expect(p.canAbort()).toBe(false);
					});
				});

				describe('when rejected', () => {
					beforeEach(() => { noUnhandledRejection(p); });
					afterEach(() => p.catch(() => {}));

					it('calls .then reject handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(rejectHandler).not.toHaveBeenCalled();

						const err = new Error('err');
						rejectInner(err);
						await tick();
						expect(rejectHandler).toHaveBeenCalledTimes(1);
						expect(rejectHandler).toHaveBeenCalledWith(err);
						expect(resolveHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBe(pInner);
						rejectInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						expect(pInner._followers).toBeArray();
						rejectInner();
						expect(pInner._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						resolveInner();
						expect(p.canAbort()).toBe(false);
					});
				});
			});

			describe('outside constructor', () => {
				let p, resolve, onAbort,
					pInner, resolveInner, rejectInner;
				beforeEach(() => {
					p = new Abortable((_resolve, _reject, _onAbort) => {
						resolve = _resolve;
						onAbort = _onAbort;
					});
					pInner = new Abortable((_resolve, _reject) => {
						resolveInner = _resolve;
						rejectInner = _reject;
					});
				});

				it('does not flag promise as not abortable', () => {
					expect(p.canAbort()).toBe(true);
					resolve(pInner);
					expect(p.canAbort()).toBe(true);
				});

				describe('clears _abortHandler when onAbort() called before resolve() and onAbort() called', () => {
					it('inside constructor', () => {
						const fn = () => {};
						// eslint-disable-next-line no-shadow
						p = new Abortable((_resolve, _reject, onAbort) => {
							resolve = _resolve;
							onAbort(fn);
						});
						expect(p._abortHandler).toBe(fn);
						resolve(pInner);
						expect(p._abortHandler).toBeUndefined();
					});

					it('outside constructor', () => {
						const fn = () => {};
						onAbort(fn);
						expect(p._abortHandler).toBe(fn);
						resolve(pInner);
						expect(p._abortHandler).toBeUndefined();
					});
				});

				it('does not register _abortHandler when onAbort() called after resolve()', () => {
					resolve(pInner);
					onAbort(() => {});
					expect(p._abortHandler).toBeUndefined();
				});

				it('clears _abortError', () => {
					const err = new Error('err');
					p.abort(err);
					expect(p._abortError).toBe(err);
					resolve(pInner);
					expect(p._abortError).toBeUndefined();
				});

				it('records following on original', () => {
					expect(p._awaiting).toBeUndefined();
					resolve(pInner);
					expect(p._awaiting).toBe(pInner);
				});

				it('records following on followed', () => {
					expect(pInner._followers).toBeUndefined();
					resolve(pInner);
					const {_followers} = pInner;
					expect(_followers).toBeArray();
					expect(_followers).toHaveLength(1);
					expect(_followers).toContain(p);
				});

				describe('when resolved', () => {
					beforeEach(() => { resolve(pInner); });
					afterEach(() => p);

					it('calls .then resolve handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(resolveHandler).not.toHaveBeenCalled();

						resolveInner(123);
						await tick();
						expect(resolveHandler).toHaveBeenCalledTimes(1);
						expect(resolveHandler).toHaveBeenCalledWith(123);
						expect(rejectHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBe(pInner);
						resolveInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						expect(pInner._followers).toBeArray();
						resolveInner();
						expect(pInner._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						resolveInner();
						expect(p.canAbort()).toBe(false);
					});
				});

				describe('when rejected', () => {
					beforeEach(() => {
						resolve(pInner);
						noUnhandledRejection(p);
					});
					afterEach(() => p.catch(() => {}));

					it('calls .then reject handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(rejectHandler).not.toHaveBeenCalled();

						const err = new Error('err');
						rejectInner(err);
						await tick();
						expect(rejectHandler).toHaveBeenCalledTimes(1);
						expect(rejectHandler).toHaveBeenCalledWith(err);
						expect(resolveHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBe(pInner);
						rejectInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						expect(pInner._followers).toBeArray();
						rejectInner();
						expect(pInner._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						resolveInner();
						expect(p.canAbort()).toBe(false);
					});
				});
			});
		});

		describe('abortable object with resolve() called', () => {
			describe('inside constructor', () => {
				let p, onAbort,
					pInner, resolveInner, rejectInner;
				beforeEach(() => {
					pInner = {
						then(resolveHandler, rejectHandler) {
							resolveInner = value => resolveHandler(value);
							rejectInner = err => rejectHandler(err);
						},
						abort() {}
					};
					p = new Abortable((resolve, _reject, _onAbort) => {
						onAbort = _onAbort;
						resolve(pInner);
					});
				});

				it('does not flag promise as not abortable', () => {
					expect(p.canAbort()).toBe(true);
				});

				describe('does not record _abortHandler when onAbort() called', () => {
					describe('inside constructor and onAbort() called', () => {
						it('first', () => {
							p = new Abortable((resolve) => {
								onAbort(() => {});
								resolve(pInner);
							});

							expect(p._abortHandler).toBeUndefined();
						});

						it('last', () => {
							p = new Abortable((resolve) => {
								resolve(pInner);
								onAbort(() => {});
							});

							expect(p._abortHandler).toBeUndefined();
						});
					});

					it('outside constructor', () => {
						onAbort(() => {});
						expect(p._abortHandler).toBeUndefined();
					});
				});

				it('does not record _abortError', () => {
					p.abort();
					expect(p._abortError).toBeUndefined();
				});

				it('records following on original', () => {
					expect(p._awaiting).toBeInstanceOf(Abortable);
				});

				it('records following on followed proxy', () => {
					const {_followers} = p._awaiting;
					expect(_followers).toBeArray();
					expect(_followers).toHaveLength(1);
					expect(_followers).toContain(p);
				});

				describe('when resolved', () => {
					afterEach(() => p);

					it('calls .then resolve handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(resolveHandler).not.toHaveBeenCalled();

						resolveInner(123);
						await tick();
						expect(resolveHandler).toHaveBeenCalledTimes(1);
						expect(resolveHandler).toHaveBeenCalledWith(123);
						expect(rejectHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBeInstanceOf(Abortable);
						resolveInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						const proxy = p._awaiting;
						expect(proxy._followers).toBeArray();
						resolveInner();
						expect(proxy._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						resolveInner();
						expect(p.canAbort()).toBe(false);
					});
				});

				describe('when rejected', () => {
					beforeEach(() => { noUnhandledRejection(p); });
					afterEach(() => p.catch(() => {}));

					it('calls .then reject handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(rejectHandler).not.toHaveBeenCalled();

						const err = new Error('err');
						rejectInner(err);
						await tick();
						expect(rejectHandler).toHaveBeenCalledTimes(1);
						expect(rejectHandler).toHaveBeenCalledWith(err);
						expect(resolveHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBeInstanceOf(Abortable);
						rejectInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						const proxy = p._awaiting;
						expect(proxy._followers).toBeArray();
						rejectInner();
						expect(proxy._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						rejectInner();
						expect(p.canAbort()).toBe(false);
					});
				});
			});

			describe('outside constructor', () => {
				let p, resolve, onAbort,
					pInner, resolveInner, rejectInner;
				beforeEach(() => {
					p = new Abortable((_resolve, _reject, _onAbort) => {
						resolve = _resolve;
						onAbort = _onAbort;
					});
					pInner = {
						then(resolveHandler, rejectHandler) {
							resolveInner = value => resolveHandler(value);
							rejectInner = err => rejectHandler(err);
						},
						abort() {}
					};
				});

				it('does not flag promise as not abortable', () => {
					expect(p.canAbort()).toBe(true);
					resolve(pInner);
					expect(p.canAbort()).toBe(true);
				});

				describe('clears _abortHandler when onAbort() called before resolve() and onAbort() called', () => {
					it('inside constructor', () => {
						const fn = () => {};
						// eslint-disable-next-line no-shadow
						p = new Abortable((_resolve, _reject, onAbort) => {
							resolve = _resolve;
							onAbort(fn);
						});
						expect(p._abortHandler).toBe(fn);
						resolve(pInner);
						expect(p._abortHandler).toBeUndefined();
					});

					it('outside constructor', () => {
						const fn = () => {};
						onAbort(fn);
						expect(p._abortHandler).toBe(fn);
						resolve(pInner);
						expect(p._abortHandler).toBeUndefined();
					});
				});

				it('does not register _abortHandler when onAbort() called after resolve()', () => {
					resolve(pInner);
					onAbort(() => {});
					expect(p._abortHandler).toBeUndefined();
				});

				it('clears _abortError', () => {
					const err = new Error('err');
					p.abort(err);
					expect(p._abortError).toBe(err);
					resolve(pInner);
					expect(p._abortError).toBeUndefined();
				});

				it('records following on original', () => {
					expect(p._awaiting).toBeUndefined();
					resolve(pInner);
					expect(p._awaiting).toBeInstanceOf(Abortable);
				});

				it('records following on followed proxy', () => {
					resolve(pInner);
					const {_followers} = p._awaiting;
					expect(_followers).toBeArray();
					expect(_followers).toHaveLength(1);
					expect(_followers).toContain(p);
				});

				describe('when resolved', () => {
					beforeEach(() => { resolve(pInner); });
					afterEach(() => p);

					it('calls .then resolve handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(resolveHandler).not.toHaveBeenCalled();

						resolveInner(123);
						await tick();
						expect(resolveHandler).toHaveBeenCalledTimes(1);
						expect(resolveHandler).toHaveBeenCalledWith(123);
						expect(rejectHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBeInstanceOf(Abortable);
						resolveInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						const proxy = p._awaiting;
						expect(proxy._followers).toBeArray();
						resolveInner();
						expect(proxy._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						resolveInner();
						expect(p.canAbort()).toBe(false);
					});
				});

				describe('when rejected', () => {
					beforeEach(() => {
						resolve(pInner);
						noUnhandledRejection(p);
					});
					afterEach(() => p.catch(() => {}));

					it('calls .then reject handler', async () => {
						const resolveHandler = spy(),
							rejectHandler = spy();
						p.then(resolveHandler, rejectHandler);

						await tick();
						expect(rejectHandler).not.toHaveBeenCalled();

						const err = new Error('err');
						rejectInner(err);
						await tick();
						expect(rejectHandler).toHaveBeenCalledTimes(1);
						expect(rejectHandler).toHaveBeenCalledWith(err);
						expect(resolveHandler).not.toHaveBeenCalled();
					});

					it('clears record of following on original', () => {
						expect(p._awaiting).toBeInstanceOf(Abortable);
						rejectInner();
						expect(p._awaiting).toBeUndefined();
					});

					it('clears record of following on followed', () => {
						const proxy = p._awaiting;
						expect(proxy._followers).toBeArray();
						rejectInner();
						expect(proxy._followers).toBeUndefined();
					});

					it('flags promise as not abortable', () => {
						expect(p.canAbort()).toBe(true);
						rejectInner();
						expect(p.canAbort()).toBe(false);
					});
				});
			});
		});
	});

	describe('does not follow value resolve() called with when is', () => {
		describe('Abortable which is already', () => { // eslint-disable-line jest/lowercase-name
			describe('aborted', () => {
				runTests({
					setup() {
						const p = new Abortable(() => {});
						p.abort();
						return {p};
					}
				});
			});

			describe('resolved', () => {
				runTests({
					setup() {
						const p = new Abortable((resolve) => { resolve(); });
						return {p};
					},
					after(p) {
						return p;
					}
				});
			});

			describe('rejected', () => {
				runTests({
					setup() {
						const err = new Error('err');
						const p = new Abortable((resolve, reject) => { reject(err); });
						noUnhandledRejection(p);
						return {p, err};
					},
					afterCreatePromise(p) {
						noUnhandledRejection(p);
					},
					after(p) {
						return p.catch(() => {});
					}
				});
			});
		});

		describe('Promise which is', () => { // eslint-disable-line jest/lowercase-name
			describe('pending', () => {
				runTests({
					setup() {
						const p = new Promise(() => {});
						return {p};
					}
				});
			});

			describe('resolved', () => {
				runTests({
					setup() {
						const p = new Promise((resolve) => { resolve(); });
						return {p};
					},
					after(p) {
						return p;
					}
				});
			});

			describe('rejected', () => {
				runTests({
					setup() {
						const err = new Error('err');
						const p = new Promise((resolve, reject) => { reject(err); });
						return {p, err};
					},
					afterCreatePromise(p) {
						noUnhandledRejection(p);
					},
					after(p) {
						return p.catch(() => {});
					}
				});
			});
		});

		function runTests({setup, afterCreatePromise, after}) {
			describe('inside constructor', () => {
				let p, onAbort,
					pInner;
				beforeEach(() => {
					pInner = setup().p;
					p = new Abortable((resolve, _reject, _onAbort) => {
						onAbort = _onAbort;
						resolve(pInner);
					});
					if (afterCreatePromise) afterCreatePromise(p);
				});

				afterEach(() => { // eslint-disable-line consistent-return
					if (after) return after(p);
				});

				it('flags promise as not abortable', () => {
					expect(p.canAbort()).toBe(false);
				});

				describe('does not record _abortHandler when onAbort() called', () => {
					describe('inside constructor and onAbort() called', () => {
						it('first', () => {
							p = new Abortable((resolve) => {
								onAbort(() => {});
								resolve(pInner);
							});

							expect(p._abortHandler).toBeUndefined();
						});

						it('last', () => {
							p = new Abortable((resolve) => {
								resolve(pInner);
								onAbort(() => {});
							});

							expect(p._abortHandler).toBeUndefined();
						});
					});

					it('outside constructor', () => {
						onAbort(() => {});
						expect(p._abortHandler).toBeUndefined();
					});
				});

				it('does not record _abortError', () => {
					p.abort();
					expect(p._abortError).toBeUndefined();
				});

				it('does not record following on original', () => {
					expect(p._awaiting).toBeUndefined();
				});

				it('does not record following on followed', () => {
					expect(pInner._followers).toBeUndefined();
				});
			});

			describe('outside constructor', () => {
				let p, resolve, onAbort,
					pInner;
				beforeEach(() => {
					pInner = new Abortable(() => {});
					pInner.abort();
					p = new Abortable((_resolve, _reject, _onAbort) => {
						resolve = _resolve;
						onAbort = _onAbort;
					});
				});

				it('flags promise as not abortable', () => {
					expect(p.canAbort()).toBe(true);
					resolve(pInner);
					expect(p.canAbort()).toBe(false);
				});

				describe('clears _abortHandler when onAbort() called before resolve() and onAbort() called', () => {
					it('inside constructor', () => {
						const fn = () => {};
						// eslint-disable-next-line no-shadow
						p = new Abortable((_resolve, _reject, onAbort) => {
							resolve = _resolve;
							onAbort(fn);
						});
						expect(p._abortHandler).toBe(fn);
						resolve(pInner);
						expect(p._abortHandler).toBeUndefined();
					});

					it('outside constructor', () => {
						const fn = () => {};
						onAbort(fn);
						expect(p._abortHandler).toBe(fn);
						resolve(pInner);
						expect(p._abortHandler).toBeUndefined();
					});
				});

				it('does not register _abortHandler when onAbort() called after resolve()', () => {
					resolve(pInner);
					onAbort(() => {});
					expect(p._abortHandler).toBeUndefined();
				});

				it('clears _abortError', () => {
					const err = new Error('err');
					p.abort(err);
					expect(p._abortError).toBe(err);
					resolve(pInner);
					expect(p._abortError).toBeUndefined();
				});

				it('does not record following on original', () => {
					resolve(pInner);
					expect(p._awaiting).toBeUndefined();
				});

				it('does not record following on followed', () => {
					resolve(pInner);
					expect(pInner._followers).toBeUndefined();
				});
			});
		}
	});

	describe('onAbort()', () => {
		describe('registers abort handler when called', () => {
			it('synchronously inside executor', () => {
				const fn = () => {};
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});

				expect(p._abortHandler).toBe(fn);
			});

			it('asynchronously', async () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => { onAbort = _onAbort; });
				await tick();

				const fn = () => {};
				onAbort(fn);
				expect(p._abortHandler).toBe(fn);
			});
		});

		describe('does not register abort handler if', () => {
			describe('resolve() called first', () => {
				it('synchronously inside executor', async () => {
					const p = new Abortable((resolve, reject, onAbort) => {
						resolve();
						onAbort(() => {});
					});

					expect(p._abortHandler).toBeUndefined();
					await p;
				});

				it('asynchronously', async () => {
					let resolve, onAbort;
					const p = new Abortable((_resolve, _reject, _onAbort) => {
						resolve = _resolve;
						onAbort = _onAbort;
					});
					await tick();

					resolve();
					onAbort(() => {});

					expect(p._abortHandler).toBeUndefined();
				});
			});

			describe('reject() called first', () => {
				it('synchronously inside executor', async () => {
					const p = new Abortable((resolve, reject, onAbort) => {
						reject();
						onAbort(() => {});
					});
					noUnhandledRejection(p);

					expect(p._abortHandler).toBeUndefined();

					await p.catch(() => {});
				});

				it('asynchronously', async () => {
					let reject, onAbort;
					const p = new Abortable((_resolve, _reject, _onAbort) => {
						reject = _reject;
						onAbort = _onAbort;
					});
					noUnhandledRejection(p);
					await tick();

					reject();
					onAbort(() => {});

					expect(p._abortHandler).toBeUndefined();

					await p.catch(() => {});
				});
			});
		});

		describe('throws if not passed a function if called', () => {
			// eslint-disable-next-line jest/expect-expect
			it('synchronously inside executor', () => {
				let err;
				new Abortable((resolve, reject, onAbort) => { // eslint-disable-line no-new
					err = tryCatch(() => onAbort());
				});

				expectCorrectError(err);
			});

			// eslint-disable-next-line jest/expect-expect
			it('asynchronously', async () => {
				let onAbort;
				// eslint-disable-next-line no-new
				new Abortable((resolve, reject, _onAbort) => { onAbort = _onAbort; });
				await tick();

				const err = tryCatch(() => onAbort());
				expectCorrectError(err);
			});

			function expectCorrectError(err) {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('onAbort() must be passed a function');
			}
		});

		describe('throws if called twice when', () => {
			// eslint-disable-next-line jest/expect-expect
			it('both calls synchronously inside executor', () => {
				let err;
				new Abortable((resolve, reject, onAbort) => { // eslint-disable-line no-new
					onAbort(() => {});
					err = tryCatch(() => onAbort(() => {}));
				});

				expectCorrectError(err);
			});

			// eslint-disable-next-line jest/expect-expect
			it('1st call synchronously inside executor, 2nd call async', async () => {
				let onAbort;
				// eslint-disable-next-line no-new
				new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
					onAbort(() => {});
				});
				await tick();

				const err = tryCatch(() => onAbort(() => {}));
				expectCorrectError(err);
			});

			// eslint-disable-next-line jest/expect-expect
			it('both calls async', async () => {
				let onAbort;
				// eslint-disable-next-line no-new
				new Abortable((resolve, reject, _onAbort) => { onAbort = _onAbort; });
				await tick();

				onAbort(() => {});
				const err = tryCatch(() => onAbort(() => {}));
				expectCorrectError(err);
			});

			function expectCorrectError(err) {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toBe('onAbort() cannot be called twice');
			}
		});
	});
});
