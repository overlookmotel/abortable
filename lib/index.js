/* --------------------
 * abortable module
 * Entry point
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable.js'),
	all = require('./all.js'),
	race = require('./race.js'),
	resolve = require('./resolve.js'),
	reject = require('./reject.js'),
	allSettled = require('./allSettled.js'),
	any = require('./any.js'),
	methods = require('./methods.js'),
	abortMethods = require('./abort.js'),
	debugMethods = require('./debug.js'),
	abortable = require('./abortableMethod.js'),
	isAbortable = require('./isAbortable.js'),
	AbortError = require('./error.js'),
	{version} = require('../package.json'),
	{IS_ABORTABLE} = require('./constants.js');

// Exports

module.exports = Abortable;

// Add static methods + props
Abortable.all = all;
Abortable.race = race;
Abortable.resolve = resolve;
Abortable.reject = reject;
Abortable.allSettled = allSettled;
Abortable.any = any;
Abortable.abortable = abortable;
Abortable.isAbortable = isAbortable;
Abortable.AbortError = AbortError;
Abortable.version = version;

// Add prototype methods + props
Object.assign(Abortable.prototype, methods, abortMethods, debugMethods);
Abortable.prototype[IS_ABORTABLE] = true;
