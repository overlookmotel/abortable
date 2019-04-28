'use strict';

module.exports = {
	testEnvironment: 'node',
	setupTestFrameworkScriptFile: 'jest-extended',
	coverageDirectory: 'coverage',
	collectCoverageFrom: [
		'**/*.js',
		'!.**',
		'!**/.**',
		'!**/node_modules/**',
		'!test/**',
		'!jest.config.js'
	]
};
