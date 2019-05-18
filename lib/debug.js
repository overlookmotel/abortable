/* --------------------
 * abortable module
 * Debug methods.
 * To be merged into Abortable + DummyAbortable class prototypes.
 * ------------------*/

'use strict';

// Modules
const debug = require('debug')('abortable');

// Debugging ID counter
let nextId = 1;

// Exports

module.exports = {
	_debugEnabled() {
		return debug.enabled;
	},

	_debugInit(from) {
		if (!this._debugEnabled()) return;

		if (from) {
			this._debugId = from._debugId;
		} else {
			this._debugId = nextId++;
		}
	},

	_debug(msg, extra) {
		if (!this._debugEnabled()) return;

		debug(`${msg}: ${this._debugName(this)}${extra ? ` ${extra}` : ''}`);
	},

	_debugName(p) {
		if (!this._debugEnabled()) return null;

		const name = p._name;
		if (!name) return `${p._debugId}`;
		return `${p._debugId} ${name}`;
	}
};
