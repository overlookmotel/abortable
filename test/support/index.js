/* --------------------
 * abortable module
 * Tests init
 * ------------------*/

'use strict';

/*
 * Throw any unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
	console.log('Unhandled rejection'); // eslint-disable-line no-console
	throw err;
});
