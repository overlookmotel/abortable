/* --------------------
 * abortable module
 * AbortError class
 * ------------------*/

'use strict';

// Exports

class AbortError extends Error {
	constructor() {
		super('Aborted');
		this.type = 'AbortError';
	}
}

module.exports = AbortError;
