/* --------------------
 * abortable module
 * `.isAbortable()` static method
 * ------------------*/

'use strict';

// Imports
const {isAbortable} = require('./utils.js');

// Exports

/**
 * Test if value can be aborted.
 * i.e. Is an object with `.then()` and `.abort()` methods.
 * @param {*} value - Input value
 * @returns {boolean} - `true` if is abortable
 */
module.exports = function(value) {
	return value != null && isAbortable(value);
};
