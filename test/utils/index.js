/* --------------------
 * abortable module
 * Tests utilities
 * ------------------*/

'use strict';

// Throw any unhandled promise rejections
process.on('unhandledRejection', (err) => {
	console.log('Unhandled rejection'); // eslint-disable-line no-console
	throw err;
});

// Exports

module.exports = {
	spy: jest.fn,

	tick() {
		return new Promise(resolve => setTimeout(resolve, 0));
	},

	tryCatch(fn) {
		try {
			fn();
			return undefined;
		} catch (err) {
			return err;
		}
	},

	noUnhandledRejection(p) {
		return p.catch(() => {});
	}
};
