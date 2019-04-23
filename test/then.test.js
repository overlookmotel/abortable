/* --------------------
 * abortable module
 * Tests for `.then()` method
 * ------------------*/

'use strict';

// Modules
const Abortable = require('../index');

// Init
require('./utils');

// Tests

describe('.then()', () => {
	describe('returns Abortable', () => {
		it('when called with no arguments', () => {
			const p = new Abortable(() => {});
			const p2 = p.then();
			expect(p2).toBeInstanceOf(Abortable);
		});

		it('when called with resolve handler', () => {
			const p = new Abortable(() => {});
			const p2 = p.then(() => {});
			expect(p2).toBeInstanceOf(Abortable);
		});

		it('when called with reject handler', () => {
			const p = new Abortable(() => {});
			const p2 = p.then(null, () => {});
			expect(p2).toBeInstanceOf(Abortable);
		});

		it('when called with resolve and reject handlers', () => {
			const p = new Abortable(() => {});
			const p2 = p.then(() => {}, () => {});
			expect(p2).toBeInstanceOf(Abortable);
		});
	});
});
