/* --------------------
 * abortable module
 * `.reject()` static method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js');

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
