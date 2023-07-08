/* --------------------
 * abortable module
 * Constants
 * ------------------*/

'use strict';

// Exports

// TODO: Keep Symbol in a separate immutable package so different instances of `abortable` package
// can recognise each other and interoperate
module.exports = {
	IS_ABORTABLE: Symbol('IS_ABORTABLE')
};
