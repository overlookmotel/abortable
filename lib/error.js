/* --------------------
 * abortable module
 * AbortError class
 * ------------------*/

'use strict';

// Exports

/**
 * AbortError class.
 * Used for default abort errors.
 */
class AbortError extends Error {
	/**
	 * @constructor
	 * @param {string} [msg] - Optional error message, defaults to `'Aborted'`
	 */
	constructor(msg) {
		super(msg || 'Aborted');
		this.type = 'AbortError';
	}
}

module.exports = AbortError;
