/* --------------------
 * abortable module
 * `.resolve()` static method
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js');

// Exports

/**
 * Replacement `.resolve()` static method.
 * Create new Abortable, resolved with value provided.
 * If value is an instance of this Abortable class, return it unchanged.
 * @param {*} [value] - Value to resolve Promise with
 * @returns {Abortable}
 */
module.exports = function(value) {
	// If value is an instance of Abortable class, return it unchanged
	if (value instanceof Abortable) return value;

	// Create new Abortable, resolved with value
	return new Abortable(resolve => resolve(value));
};
