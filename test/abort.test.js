/* --------------------
 * abortable module
 * Tests for `.abort()` method
 * ------------------*/

// TODO Remove this line
/* eeslint-disable jest/no-focused-tests, jest/no-disabled-tests */

'use strict';

// Modules
const Abortable = require('../index.js');

// Imports
const {spy, tick} = require('./support/utils.js');

// Init
require('./support/index.js');

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
		let pInner, onAbortInner, abortHandlerInner, abortErr;
		beforeEach(() => {
			pInner = new Abortable((_resolve, _reject, _onAbort) => {
				onAbortInner = _onAbort;
			});
			abortHandlerInner = spy();
			abortErr = new Error('err');
		});

		describe('resolved inside executor', () => {
			let p, onAbort;
			beforeEach(() => {
				p = new Abortable((resolve, _reject, _onAbort) => {
					onAbort = _onAbort;
					resolve(pInner);
				});
			});

			describe('when onAbort() not called in outer abortable', () => {
				runTests();
			});

			describe('when onAbort() called in outer abortable', () => {
				beforeEach(() => {
					onAbort(() => {});
				});

				runTests();
			});

			function runTests() {
				describe('inner abort handler registered before abort', () => {
					it('calls inner abort handler', () => {
						onAbortInner(abortHandlerInner);
						expect(abortHandlerInner).not.toHaveBeenCalled();
						p.abort(abortErr);
						expect(abortHandlerInner).toHaveBeenCalledTimes(1);
						expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
					});

					it('clears inner _abortHandler', () => {
						onAbortInner(abortHandlerInner);
						expect(pInner._abortHandler).toBe(abortHandlerInner);
						p.abort(abortErr);
						expect(pInner._abortHandler).toBeUndefined();
					});

					it('does not set outer _abortError', () => {
						onAbortInner(abortHandlerInner);
						p.abort(abortErr);
						expect(p._abortError).toBeUndefined();
					});

					it('sets inner _abortError', () => {
						onAbortInner(abortHandlerInner);
						expect(pInner._abortError).toBeUndefined();
						p.abort(abortErr);
						expect(pInner._abortError).toBe(abortErr);
					});
				});

				describe('inner abort handler registered after abort', () => {
					it('calls inner abort handler', () => {
						p.abort(abortErr);
						expect(abortHandlerInner).not.toHaveBeenCalled();
						onAbortInner(abortHandlerInner);
						expect(abortHandlerInner).toHaveBeenCalledTimes(1);
						expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
					});

					it('does not set inner _abortHandler', () => {
						p.abort(abortErr);
						onAbortInner(abortHandlerInner);
						expect(pInner._abortHandler).toBeUndefined();
					});

					it('does not set outer _abortError', () => {
						p.abort(abortErr);
						onAbortInner(abortHandlerInner);
						expect(p._abortError).toBeUndefined();
					});

					it('sets inner _abortError', () => {
						expect(pInner._abortError).toBeUndefined();
						p.abort(abortErr);
						onAbortInner(abortHandlerInner);
						expect(pInner._abortError).toBe(abortErr);
					});
				});
			}

			// TODO Write more tests
		});

		describe('resolved outside executor', () => {
			let p, resolve, onAbort;
			beforeEach(() => {
				p = new Abortable((_resolve, _reject, _onAbort) => {
					resolve = _resolve;
					onAbort = _onAbort;
				});
			});

			describe('when onAbort() not called in outer abortable', () => {
				runTests();
			});

			describe('when onAbort() called in outer abortable', () => {
				beforeEach(() => {
					onAbort(() => {});
				});

				runTests();
			});

			function runTests() {
				describe('abort() called before resolve()', () => {
					describe('inner abort handler registered before', () => {
						it('calls inner abort handler', () => {
							onAbortInner(abortHandlerInner);
							p.abort(abortErr);
							expect(abortHandlerInner).not.toHaveBeenCalled();
							resolve(pInner);
							expect(abortHandlerInner).toHaveBeenCalledTimes(1);
							expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
						});

						it('clears inner _abortHandler', () => {
							onAbortInner(abortHandlerInner);
							p.abort(abortErr);
							expect(pInner._abortHandler).toBe(abortHandlerInner);
							resolve(pInner);
							expect(pInner._abortHandler).toBeUndefined();
						});

						it('does not set outer _abortError', () => {
							onAbortInner(abortHandlerInner);
							p.abort(abortErr);
							resolve(pInner);
							expect(p._abortError).toBeUndefined();
						});

						it('sets inner _abortError', () => {
							onAbortInner(abortHandlerInner);
							expect(pInner._abortError).toBeUndefined();
							p.abort(abortErr);
							resolve(pInner);
							expect(pInner._abortError).toBe(abortErr);
						});
					});

					describe('inner abort handler registered between abort and resolve', () => {
						it('calls inner abort handler', () => {
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							expect(abortHandlerInner).not.toHaveBeenCalled();
							resolve(pInner);
							expect(abortHandlerInner).toHaveBeenCalledTimes(1);
							expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
						});

						it('clears inner _abortHandler', () => {
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortHandler).toBe(abortHandlerInner);
							resolve(pInner);
							expect(pInner._abortHandler).toBeUndefined();
						});

						it('does not set outer _abortError', () => {
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							resolve(pInner);
							expect(p._abortError).toBeUndefined();
						});

						it('sets inner _abortError', () => {
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortError).toBeUndefined();
							resolve(pInner);
							expect(pInner._abortError).toBe(abortErr);
						});
					});

					describe('inner abort handler registered after', () => {
						it('calls inner abort handler', () => {
							p.abort(abortErr);
							resolve(pInner);
							expect(abortHandlerInner).not.toHaveBeenCalled();
							onAbortInner(abortHandlerInner);
							expect(abortHandlerInner).toHaveBeenCalledTimes(1);
							expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
						});

						it('does not set inner _abortHandler', () => {
							p.abort(abortErr);
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortHandler).toBeUndefined();
						});

						it('does not set outer _abortError', () => {
							p.abort(abortErr);
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							expect(p._abortError).toBeUndefined();
						});

						it('sets inner _abortError', () => {
							p.abort(abortErr);
							expect(pInner._abortError).toBeUndefined();
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortError).toBe(abortErr);
						});
					});
				});

				describe('abort() called after resolve()', () => {
					describe('inner abort handler registered before', () => {
						it('calls inner abort handler', () => {
							onAbortInner(abortHandlerInner);
							resolve(pInner);
							expect(abortHandlerInner).not.toHaveBeenCalled();
							p.abort(abortErr);
							expect(abortHandlerInner).toHaveBeenCalledTimes(1);
							expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
						});

						it('clears inner _abortHandler', () => {
							onAbortInner(abortHandlerInner);
							resolve(pInner);
							expect(pInner._abortHandler).toBe(abortHandlerInner);
							p.abort(abortErr);
							expect(pInner._abortHandler).toBeUndefined();
						});

						it('does not set outer _abortError', () => {
							onAbortInner(abortHandlerInner);
							resolve(pInner);
							p.abort(abortErr);
							expect(p._abortError).toBeUndefined();
						});

						it('sets inner _abortError', () => {
							onAbortInner(abortHandlerInner);
							resolve(pInner);
							expect(pInner._abortError).toBeUndefined();
							p.abort(abortErr);
							expect(pInner._abortError).toBe(abortErr);
						});
					});

					describe('inner abort handler registered between resolve and abort', () => {
						it('calls inner abort handler', () => {
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							expect(abortHandlerInner).not.toHaveBeenCalled();
							p.abort(abortErr);
							expect(abortHandlerInner).toHaveBeenCalledTimes(1);
							expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
						});

						it('clears inner _abortHandler', () => {
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortHandler).toBe(abortHandlerInner);
							p.abort(abortErr);
							expect(pInner._abortHandler).toBeUndefined();
						});

						it('does not set outer _abortError', () => {
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							p.abort(abortErr);
							expect(p._abortError).toBeUndefined();
						});

						it('sets inner _abortError', () => {
							resolve(pInner);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortError).toBeUndefined();
							p.abort(abortErr);
							expect(pInner._abortError).toBe(abortErr);
						});
					});

					describe('inner abort handler registered after', () => {
						it('calls inner abort handler', () => {
							resolve(pInner);
							p.abort(abortErr);
							expect(abortHandlerInner).not.toHaveBeenCalled();
							onAbortInner(abortHandlerInner);
							expect(abortHandlerInner).toHaveBeenCalledTimes(1);
							expect(abortHandlerInner).toHaveBeenCalledWith(abortErr);
						});

						it('does not set inner _abortHandler', () => {
							resolve(pInner);
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortHandler).toBeUndefined();
						});

						it('does not set outer _abortError', () => {
							resolve(pInner);
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							expect(p._abortError).toBeUndefined();
						});

						it('sets inner _abortError', () => {
							resolve(pInner);
							expect(pInner._abortError).toBeUndefined();
							p.abort(abortErr);
							onAbortInner(abortHandlerInner);
							expect(pInner._abortError).toBe(abortErr);
						});
					});
				});
			}

			// TODO Write more tests
		});
	});

	describe('called on Abortable resolved with abortable object', () => {
		// TODO Write tests
	});

	describe('called on Abortable chained on another Abortable with `.then`', () => {
		// TODO Write tests
	});

	// TODO Write more tests
});
