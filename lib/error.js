/* --------------------
 * abortable module
 * AbortedError class
 * ------------------*/

'use strict';

// Exports

class AbortedError extends Error {
	constructor() {
		super('Aborted');
		this.type = 'AbortedError';
	}
}

module.exports = AbortedError;
