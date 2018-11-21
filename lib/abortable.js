/* --------------------
 * abortable module
 * `.abortable()` static method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./');

// Exports

module.exports = function() {
	return new Abortable((resolve, reject, onAbort) => {
		onAbort(err => reject(err));
		Promise.resolve().then(resolve);
	});
};
