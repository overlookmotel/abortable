/* --------------------
 * abortable module
 * `.reject()` method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable');

// Exports

/**
 * Replacement `.reject()` static method.
 * Create new Abortable, rejected with reason provided.
 * @param {*} [reason] - Value to reject Promise with
 * @returns {Abortable}
 */
module.exports = function(reason) {
	return new Abortable((resolve, reject) => reject(reason));
};
