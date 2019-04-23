/* --------------------
 * abortable module
 * Tests
 * ------------------*/

'use strict';

// Modules
const Abortable = require('../index');

// Init
require('./utils');

// Tests

describe('tests', () => {
	it.skip('all', () => { // eslint-disable-line jest/no-disabled-tests
		expect(Abortable).not.toBeUndefined();
	});
});
