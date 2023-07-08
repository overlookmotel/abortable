/* --------------------
 * abortable module
 * DummyAbortable class
 * ------------------*/

'use strict';

// Imports
const methods = require('./methods.js'),
	debugMethods = require('./debug.js'),
	{toAbortable} = require('./utils.js');

// Exports

/*
 * DummyAbortable class
 * Is used in Abortable constructor as a substitute for Abortable before the real
 * Abortable is available in the constructor.
 * Registers `resolve()`, `reject()` or `onAbort()` being called inside Promise executor function.
 */
class DummyAbortable {
	/**
	 * @constructor
	 */
	constructor() {
		this._canAbort = true;
		this._isFateSealed = false;
		this._abortHandler = undefined;
		this._onAbortWasCalled = false;
		this._awaiting = undefined;

		this._debugInit();
		this._debug('constructor');
	}

	/**
	 * Promise resolved with value.
	 * If resolved with an abortable, follow it.
	 * Same method as on `Abortable` class, but simplified because dummy cannot be aborted,
	 * and does not record following on followed.
	 * @private
	 * @param {*} value - Value promise resolved with
	 * @returns {*} - Wrapped resolution value
	 */
	_settled(value) {
		this._debug('settled dummy');

		// If result cannot be followed, exit
		const target = toAbortable(value);
		if (!target || !target._canAbort) {
			this._clear();
			return value;
		}

		// Follow promise
		// Remove abort handler
		this._abortHandler = undefined;

		// Record following on target.
		// NB Do not record follower on followed.
		// Will be done later in Abortable constructor, so actual Abortable
		// is recorded as the follower, not the dummy.
		// TODO: Handle case where target is resolved within follower's promise executor function
		// i.e. target is resolved before real abortable is added to array of followers.
		target._followedIncrementCount();

		// Record awaiting
		this._awaiting = target;

		// Return wrapped value
		return target;
	}

	/**
	 * Promise resolved.
	 * Clear state.
	 * Same method as on `Abortable` class, but simplified because dummy cannot be aborted.
	 * @private
	 * @returns {undefined}
	 */
	_clear() {
		this._canAbort = false;
		this._abortHandler = undefined;
	}
}

// Add methods from Abortable
Object.assign(DummyAbortable.prototype, {
	_resolved: methods._resolved,
	_rejected: methods._rejected,
	_sealFate: methods._sealFate,
	_onAbort: methods._registerAbortHandler
});

// Add debug methods
Object.assign(DummyAbortable.prototype, debugMethods);

module.exports = DummyAbortable;
