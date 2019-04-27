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
		function expectSameError(value) {
			const err1 = tryCatch(() => new Promise(value));
			const err2 = tryCatch(() => new Abortable(value));
			expect(err1).toBeDefined();
			expect(err2).toBeDefined();
			expect(err2.name).toBe(err1.name);
			expect(err2.message).toBe(err1.message);
		}

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
		let p, resolve, onAbort;
		beforeEach(() => {
			p = new Abortable((_resolve, _reject, _onAbort) => {
				resolve = _resolve;
				onAbort = _onAbort;
			});
		});

		describe('Abortable', () => { // eslint-disable-line jest/lowercase-name
			let pInner, resolveInner, rejectInner;
			beforeEach(() => {
				pInner = new Abortable((_resolve, _reject) => {
					resolveInner = _resolve;
					rejectInner = _reject;
				});
			});

			it('clears _abortHandler', () => {
				const fn = () => {};
				onAbort(fn);
				expect(p._abortHandler).toBe(fn);
				resolve(pInner);
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

		describe('abortable object', () => {
			let pInner, resolveInner, rejectInner;
			beforeEach(() => {
				pInner = {
					then(resolveHandler, rejectHandler) {
						resolveInner = value => resolveHandler(value);
						rejectInner = value => rejectHandler(value);
					},
					abort() {}
				};
			});

			it('clears _abortHandler', () => {
				const fn = () => {};
				onAbort(fn);
				expect(p._abortHandler).toBe(fn);
				resolve(pInner);
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

	describe('does not follow value resolve() called with when is', () => {
		describe('Promise', () => { // eslint-disable-line jest/lowercase-name
			// TODO Write this!
		});
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
			function expectCorrectError(err) {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('onAbort() must be passed a function');
			}

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
		});

		describe('throws if called twice when', () => {
			function expectCorrectError(err) {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toBe('onAbort() cannot be called twice');
			}

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
		});
	});
});
