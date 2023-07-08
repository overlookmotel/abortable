/* --------------------
 * abortable module
 * Tests for `.then()` method
 * ------------------*/

'use strict';

// Modules
const Abortable = require('abortable');

// Init
require('./support/index.js');

// Tests

describe('.then()', () => {
	describe('returns Abortable when called with', () => {
		let p;
		beforeEach(() => {
			p = new Abortable(() => {});
		});

		it('no arguments', () => {
			const p2 = p.then();
			expect(p2).toBeInstanceOf(Abortable);
		});

		it('resolve handler', () => {
			const p2 = p.then(() => {});
			expect(p2).toBeInstanceOf(Abortable);
		});

		it('reject handler', () => {
			const p2 = p.then(null, () => {});
			expect(p2).toBeInstanceOf(Abortable);
		});

		it('resolve and reject handlers', () => {
			const p2 = p.then(() => {}, () => {});
			expect(p2).toBeInstanceOf(Abortable);
		});
	});

	// TODO: Write more tests
});
