/* --------------------
 * abortable module
 * `.resolve()` method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable');

// Exports

/**
 * Replacement `.resolve()` method.
 * @param {*} value - Input value
 * @returns {Abortable}
 */
module.exports = function(value) {
	return new Abortable(resolve => resolve(value));
};
