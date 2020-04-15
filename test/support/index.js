/* --------------------
 * abortable module
 * Tests init
 * ------------------*/

'use strict';

/*
 * Throw any unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
	throw err;
});
