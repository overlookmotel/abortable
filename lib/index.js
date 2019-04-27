/* --------------------
 * abortable module
 * Entry point
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable'),
	resolve = require('./resolve'),
	reject = require('./reject'),
	all = require('./all'),
	race = require('./race'),
	methods = require('./methods'),
	abortMethods = require('./abort'),
	abortable = require('./abortableMethod'),
	isAbortable = require('./isAbortable'),
	AbortError = require('./error'),
	{version} = require('../package.json'),
	_finally = require('./finally'),
	{IS_ABORTABLE} = require('./constants');

// Exports

module.exports = Abortable;

// Add static methods + props
Abortable.resolve = resolve;
Abortable.reject = reject;
Abortable.all = all;
Abortable.race = race;
Abortable.abortable = abortable;
Abortable.isAbortable = isAbortable;
Abortable.AbortError = AbortError;
Abortable.version = version;

// Add prototype methods + props
Object.assign(Abortable.prototype, methods, abortMethods);
Abortable.prototype.finally = _finally;
Abortable.prototype[IS_ABORTABLE] = true;
