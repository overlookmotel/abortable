/* --------------------
 * abortable module
 * `.abortable()` static method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js');

// Exports

/**
 * Return an Abortable which resolves in 1 microtick unless is aborted before that.
 * i.e. Would need to be aborted syncronously straight after creation.
 * @returns {Abortable<undefined>}
 */
module.exports = function() {
	return new Abortable((resolve, reject, onAbort) => {
		let aborted = false;

		onAbort((err) => {
			aborted = true;
			reject(err);
		});

		Promise.resolve().then(() => {
			if (!aborted) resolve();
		});
	});
};
