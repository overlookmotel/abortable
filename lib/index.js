/* --------------------
 * abortable module
 * Entry point
 * ------------------*/

'use strict';

// Imports
const Abortable = require('./abortable'),
	{IS_ABORTABLE} = require('./constants'),
	AbortError = require('./error'),
	all = require('./all'),
	race = require('./race'),
	abortable = require('./abortableMethod'),
	_finally = require('./finally'),
	{isAbortable} = require('./utils'),
	{version} = require('../package.json');

// Exports

module.exports = Abortable;

// Add static methods + props
Abortable.AbortError = AbortError;
Abortable.isAbortable = isAbortable;
Abortable.all = all;
Abortable.race = race;
Abortable.abortable = abortable;

// Add prototype methods + props
Abortable.prototype.finally = _finally;
Abortable.prototype[IS_ABORTABLE] = true;
Abortable.version = version;
