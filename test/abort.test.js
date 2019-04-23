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
		describe('calls abort handler', () => {
			it('when abort handler added synchronously inside executor', () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});

				expect(fn).not.toHaveBeenCalled();

				p.abort();

				expect(fn).toHaveBeenCalledTimes(1);
			});

			it('when abort handler added asynchronously', async () => {
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

			it('when abort handler added after .abort() called', () => {
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

		describe('calls abort handler with specified error', () => {
			it('when abort handler added synchronously inside executor', () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});
				const err = new Error('err');
				p.abort(err);

				expect(fn).toHaveBeenCalledWith(err);
			});

			it('when abort handler added asynchronously', async () => {
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

			it('when abort handler added after .abort() called', () => {
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

		describe('calls abort handler with default AbortError if none specified', () => {
			it('when abort handler added synchronously inside executor', () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
				});
				p.abort();

				const args = fn.mock.calls[0];
				expect(args).toHaveLength(1);
				expect(args[0]).toBeInstanceOf(Abortable.AbortError);
			});

			it('when abort handler added asynchronously', async () => {
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

			it('when abort handler added after .abort() called', () => {
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

		describe('does not call abort handler if resolve() already called', () => {
			it('when abort handler added and resolve called synchronously inside executor', async () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
					resolve();
				});
				p.abort();
				await p;

				expect(fn).not.toHaveBeenCalled();
			});

			it('when abort handler added synchronously inside executor and resolve called async', async () => {
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

			it('when abort handler added asynchronously', async () => {
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

			it('when abort handler added after .abort() called', async () => {
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

		describe('does not call abort handler if reject() already called', () => {
			it('when abort handler added and reject called synchronously inside executor', async () => {
				const fn = spy();
				const p = new Abortable((resolve, reject, onAbort) => {
					onAbort(fn);
					reject();
				});
				p.abort();
				await expect(p).toReject();

				expect(fn).not.toHaveBeenCalled();
			});

			it('when abort handler added synchronously inside executor and reject called async', async () => {
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

			it('when abort handler added asynchronously', async () => {
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

			it('when abort handler added after .abort() called', async () => {
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
	});
});
