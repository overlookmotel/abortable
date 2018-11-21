/* --------------------
 * abortable module
 * `.abortable()` static method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./');

// Exports

/**
 * Return an Abortable which resolves in 1 microtick unless is aborted before that.
 * i.e. Would need to be aborted syncronously straight after creation.
 * @returns {Abortable}
 */
module.exports = function() {
	return new Abortable((resolve, reject, onAbort) => {
		onAbort(err => reject(err));
		Promise.resolve().then(resolve);
	});
};
