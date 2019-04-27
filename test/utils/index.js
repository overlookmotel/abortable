/* --------------------
 * abortable module
 * Tests utilities
 * ------------------*/

'use strict';

/*
 * Throw any unhandled promise rejections.
 * For easier debugging of where an unhandled rejection is coming from,
 * if rejected Promise has a `._name` property, it is included in the error message.
 */
process.on('unhandledRejection', (err, promise) => {
	let ctr = promise.constructor.name;
	if (promise._name) ctr += ` ${promise._name}`;
	throw new Error(`Unhandled rejection: ${(err || {}).message} (${ctr})`);
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
