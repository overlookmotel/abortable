/* --------------------
 * abortable module
 * Tests utilities
 * ------------------*/

'use strict';

// Exports

module.exports = {
	spy: jest.fn,
	tick,
	tryCatch,
	noUnhandledRejection
};

function tick() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

function tryCatch(fn) {
	try {
		fn();
		return undefined;
	} catch (err) {
		return err;
	}
}

function noUnhandledRejection(p) {
	return p.catch(() => {});
}
