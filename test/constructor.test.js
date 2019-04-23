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
		function sameErrorMessage(value) {
			const err1 = tryCatch(() => new Promise(value));
			const err2 = tryCatch(() => new Abortable(value));
			expect(err1).toBeDefined();
			expect(err2).toBeDefined();
			expect(err2.name).toBe(err1.name);
			expect(err2.message).toBe(err1.message);
		}

		it('undefined', () => { // eslint-disable-line jest/expect-expect
			sameErrorMessage();
		});

		it('null', () => { // eslint-disable-line jest/expect-expect
			sameErrorMessage(null);
		});

		it('boolean', () => { // eslint-disable-line jest/expect-expect
			sameErrorMessage(true);
		});

		it('string', () => { // eslint-disable-line jest/expect-expect
			sameErrorMessage('abc');
		});

		it('number', () => { // eslint-disable-line jest/expect-expect
			sameErrorMessage(123);
		});

		it('object', () => { // eslint-disable-line jest/expect-expect
			sameErrorMessage({call() {}});
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

	describe('onAbort()', () => {
		describe('registers abort handler', () => {
			it('if called synchronously inside executor', () => {
				const fn = () => {};
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});

				expect(p._abortHandler).toBe(fn);
			});

			it('if called asynchronously', async () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => { onAbort = _onAbort; });
				await tick();

				const fn = () => {};
				onAbort(fn);
				expect(p._abortHandler).toBe(fn);
			});
		});

		describe('does not register abort handler', () => {
			describe('if resolve() called first', () => {
				it('synchronously inside executor', async () => {
					const p = new Abortable((resolve, reject, onAbort) => {
						resolve();
						onAbort(() => {});
					});

					expect(p._abortHandler).toBeUndefined();
					await p;
				});

				it('asynchronously inside executor', async () => {
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

			describe('if reject() called first', () => {
				it('synchronously inside executor', async () => {
					const p = new Abortable((resolve, reject, onAbort) => {
						reject();
						onAbort(() => {});
					});
					noUnhandledRejection(p);

					expect(p._abortHandler).toBeUndefined();

					await p.catch(() => {});
				});

				it('asynchronously inside executor', async () => {
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

		describe('throws if not passed a function', () => {
			it('if called synchronously inside executor', () => {
				let err;
				new Abortable((resolve, reject, onAbort) => { // eslint-disable-line no-new
					err = tryCatch(() => onAbort());
				});

				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('onAbort() must be passed a function');
			});

			it('if called asynchronously', async () => {
				let onAbort;
				// eslint-disable-next-line no-new
				new Abortable((resolve, reject, _onAbort) => { onAbort = _onAbort; });
				await tick();

				const err = tryCatch(() => onAbort());
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(TypeError);
				expect(err.message).toBe('onAbort() must be passed a function');
			});
		});
	});
});
