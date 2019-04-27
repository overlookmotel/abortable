/* --------------------
 * abortable module
 * Tests for `.abort()` method
 * ------------------*/

'use strict';

// Modules
const Abortable = require('../index');

// Init
const {spy, tick} = require('./utils');

// Tests

describe('.abort()', () => {
	describe('called directly on constructed Abortable', () => {
		describe('calls abort handler when abort handler added', () => {
			it('synchronously inside executor', () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});

				expect(fn).not.toHaveBeenCalled();

				p.abort();

				expect(fn).toHaveBeenCalledTimes(1);
			});

			it('asynchronously', async () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
				});
				await tick();

				const fn = spy();
				onAbort(fn);

				expect(fn).not.toHaveBeenCalled();

				p.abort();

				expect(fn).toHaveBeenCalledTimes(1);
			});

			it('after .abort() called', () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
				});
				p.abort();
				const fn = spy();
				onAbort(fn);

				expect(fn).toHaveBeenCalledTimes(1);
			});
		});

		describe('calls abort handler with specified error when abort handler added', () => {
			it('synchronously inside executor', () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});
				const err = new Error('err');
				p.abort(err);

				expect(fn).toHaveBeenCalledWith(err);
			});

			it('asynchronously', async () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
				});
				await tick();

				const fn = spy();
				onAbort(fn);
				const err = new Error('err');
				p.abort(err);

				expect(fn).toHaveBeenCalledWith(err);
			});

			it('after .abort() called', () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
				});
				const err = new Error('err');
				p.abort(err);
				const fn = spy();
				onAbort(fn);

				expect(fn).toHaveBeenCalledWith(err);
			});
		});

		describe('calls abort handler with default AbortError if none specified when abort handler added', () => {
			it('synchronously inside executor', () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});
				p.abort();

				const args = fn.mock.calls[0];
				expect(args).toHaveLength(1);
				expect(args[0]).toBeInstanceOf(Abortable.AbortError);
			});

			it('asynchronously', async () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
				});
				await tick();

				const fn = spy();
				onAbort(fn);
				p.abort();

				const args = fn.mock.calls[0];
				expect(args).toHaveLength(1);
				expect(args[0]).toBeInstanceOf(Abortable.AbortError);
			});

			it('after .abort() called', () => {
				let onAbort;
				const p = new Abortable((resolve, reject, _onAbort) => {
					onAbort = _onAbort;
				});
				p.abort();
				const fn = spy();
				onAbort(fn);

				const args = fn.mock.calls[0];
				expect(args).toHaveLength(1);
				expect(args[0]).toBeInstanceOf(Abortable.AbortError);
			});
		});

		describe('does not call abort handler if resolve() called before .abort() and', () => {
			it('abort handler added and resolve called synchronously inside executor', async () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
					resolve();
				});
				p.abort();
				await p;

				expect(fn).not.toHaveBeenCalled();
			});

			it('abort handler added synchronously inside executor and resolve called async', async () => {
				let resolve;
				const fn = spy();
				const p = new Abortable((_resolve, reject, onAbort) => {
					onAbort(fn);
					resolve = _resolve;
				});
				await tick();

				resolve();
				p.abort();
				await p;

				expect(fn).not.toHaveBeenCalled();
			});

			it('abort handler added asynchronously', async () => {
				let resolve, onAbort;
				const p = new Abortable((_resolve, _reject, _onAbort) => {
					resolve = _resolve;
					onAbort = _onAbort;
				});
				await tick();

				const fn = spy();
				onAbort(fn);
				resolve();
				p.abort();
				await p;

				expect(fn).not.toHaveBeenCalled();
			});

			it('abort handler added after .abort() called', async () => {
				let resolve, onAbort;
				const p = new Abortable((_resolve, _reject, _onAbort) => {
					resolve = _resolve;
					onAbort = _onAbort;
				});
				resolve();
				p.abort();
				const fn = spy();
				onAbort(fn);
				await p;

				expect(fn).not.toHaveBeenCalled();
			});
		});

		describe('does not call abort handler if reject() called before .abort() and', () => {
			it('abort handler added and reject called synchronously inside executor', async () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
					reject();
				});
				p.abort();
				await expect(p).toReject();

				expect(fn).not.toHaveBeenCalled();
			});

			it('abort handler added synchronously inside executor and reject called async', async () => {
				let reject;
				const fn = spy();
				const p = new Abortable((_resolve, _reject, onAbort) => {
					onAbort(fn);
					reject = _reject;
				});
				await tick();

				reject();
				p.abort();
				await expect(p).toReject();

				expect(fn).not.toHaveBeenCalled();
			});

			it('abort handler added asynchronously', async () => {
				let reject, onAbort;
				const p = new Abortable((_resolve, _reject, _onAbort) => {
					reject = _reject;
					onAbort = _onAbort;
				});
				await tick();

				const fn = spy();
				onAbort(fn);
				reject();
				p.abort();
				await expect(p).toReject();

				expect(fn).not.toHaveBeenCalled();
			});

			it('abort handler added after .abort() called', async () => {
				let reject, onAbort;
				const p = new Abortable((_resolve, _reject, _onAbort) => {
					reject = _reject;
					onAbort = _onAbort;
				});
				reject();
				p.abort();
				const fn = spy();
				onAbort(fn);
				await expect(p).toReject();

				expect(fn).not.toHaveBeenCalled();
			});
		});

		it('marks promise as not abortable', () => {
			const p = new Abortable(() => {});
			expect(p.canAbort()).toBe(true);
			p.abort();
			expect(p.canAbort()).toBe(false);
		});

		it('clears _abortHandler when abort handler registered before abort', () => {
			const fn = () => {};
			const p = new Abortable((resolve, reject, onAbort) => { onAbort(fn); });

			expect(p._abortHandler).toBe(fn);
			p.abort();
			expect(p._abortHandler).toBeUndefined();
		});

		it('does not record _abortHandler when abort handler registered after abort', () => {
			let onAbort;
			const p = new Abortable((_resolve, _reject, _onAbort) => { onAbort = _onAbort; });

			expect(p._abortHandler).toBeUndefined();
			p.abort();
			expect(p._abortHandler).toBeUndefined();
			onAbort(() => {});
			expect(p._abortHandler).toBeUndefined();
		});

		describe('records _abortError when', () => {
			it('no onAbort handler registered', () => {
				const p = new Abortable(() => {});

				const err = new Error('err');
				p.abort(err);
				expect(p._abortError).toBe(err);
			});

			it('onAbort handler registered', () => {
				const p = new Abortable((resolve, reject, onAbort) => { onAbort(() => {}); });

				const err = new Error('err');
				p.abort(err);
				expect(p._abortError).toBe(err);
			});

			it('onAbort handler registered after abort', () => {
				let onAbort;
				const p = new Abortable((_resolve, _reject, _onAbort) => { onAbort = _onAbort; });

				const err = new Error('err');
				p.abort(err);
				onAbort(() => {});
				expect(p._abortError).toBe(err);
			});
		});
	});

	describe('called on Abortable resolved with another Abortable', () => {
		// TODO Write tests
	});

	describe('called on Abortable resolved with abortable object', () => {
		// TODO Write tests
	});

	describe('called on Abortable chained on another Abortable with `.then`', () => {
		// TODO Write tests
	});

	// TODO More tests
});
