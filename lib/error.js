/* --------------------
 * abortable module
 * AbortError class
 * ------------------*/

'use strict';

// Exports

class AbortError extends Error {
	constructor(msg) {
		super(msg || 'Aborted');
		this.type = 'AbortError';
	}
}

module.exports = AbortError;
