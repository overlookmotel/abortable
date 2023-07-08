/* --------------------
 * abortable module
 * Tests for behavior of native JS Promise
 * ------------------*/

'use strict';

// Imports
const {tick} = require('./support/utils.js');

// Init
require('./support/index.js');

// Tests

class PromiseExtended extends Promise {
	constructor(executor) {
		super(executor || (() => {}));
		this.thenCalledTimes = 0;
	}

	then() {
		this.thenCalledTimes++;
	}
}

describe('Native JS Promise', () => {
	describe('calls `.then()` asynchronously on promise passed to `resolve()`', () => {
		describe('`resolve()` called synchronously in executor', () => {
			it('of native Promise', async () => {
				const p = new PromiseExtended();
				new Promise(resolve => resolve(p)); // eslint-disable-line no-new
				expect(p.thenCalledTimes).toBe(0);
				await tick();
				expect(p.thenCalledTimes).toBe(1);
			});

			it('of extended Promise', async () => {
				const p = new PromiseExtended();
				new PromiseExtended(resolve => resolve(p)); // eslint-disable-line no-new
				expect(p.thenCalledTimes).toBe(0);
				await tick();
				expect(p.thenCalledTimes).toBe(1);
			});
		});

		describe('`resolve()` called synchronously after construction of Promise', () => {
			it('of native Promise', async () => {
				let resolve;
				new Promise((_resolve) => { resolve = _resolve; }); // eslint-disable-line no-new
				const p = new PromiseExtended();
				resolve(p);
				expect(p.thenCalledTimes).toBe(0);
				await tick();
				expect(p.thenCalledTimes).toBe(1);
			});

			it('of extended Promise', async () => {
				let resolve;
				new PromiseExtended((_resolve) => { resolve = _resolve; }); // eslint-disable-line no-new
				const p = new PromiseExtended();
				resolve(p);
				expect(p.thenCalledTimes).toBe(0);
				await tick();
				expect(p.thenCalledTimes).toBe(1);
			});
		});

		describe('`resolve()` called asynchronously', () => {
			it('of native Promise', async () => {
				let resolve;
				new Promise((_resolve) => { resolve = _resolve; }); // eslint-disable-line no-new
				await tick();
				const p = new PromiseExtended();
				resolve(p);
				expect(p.thenCalledTimes).toBe(0);
				await tick();
				expect(p.thenCalledTimes).toBe(1);
			});

			it('of extended Promise', async () => {
				let resolve;
				new PromiseExtended((_resolve) => { resolve = _resolve; }); // eslint-disable-line no-new
				await tick();
				const p = new PromiseExtended();
				resolve(p);
				expect(p.thenCalledTimes).toBe(0);
				await tick();
				expect(p.thenCalledTimes).toBe(1);
			});
		});
	});

	// eslint-disable-next-line jest/no-disabled-tests
	describe.skip('calls `.then()` asynchronously on promise returned from `.then()` handler', () => {
		it('foo', async () => {
			let p;
			Promise.resolve().then(() => {
				p = new PromiseExtended();
				return p;
			});
			await tick();
			expect(p.thenCalledTimes).toBe(0);
			await tick();
			expect(p.thenCalledTimes).toBe(1);
		});
	});
});
