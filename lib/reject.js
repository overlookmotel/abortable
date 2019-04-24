/* --------------------
 * abortable module
 * `.reject()` method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable');

// Exports

/**
 * Replacement `.reject()` method.
 * @param {*} err - Rejection reason
 * @returns {Abortable}
 */
module.exports = function(err) {
	return new Abortable((resolve, reject) => reject(err));
};
