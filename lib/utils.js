/* --------------------
 * abortable module
 * Utility functions
 * ------------------*/

'use strict';

// Exports

function isPromise(p) {
	if (!p) return false;
	return typeof p.then == 'function';
}

function isAbortable(p) {
	return isPromise(p) && !!p._isAbortable;
}

module.exports = {isPromise, isAbortable};
