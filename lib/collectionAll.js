/* --------------------
 * abortable module
 * CollectionAll class
 * ------------------*/

'use strict';

// Imports
const Collection = require('./collection');

// Exports

class CollectionAll extends Collection {
	done() {
		if (this.errored) return this.reject(this.error);
		this.resolve(this.result);
	}
}

module.exports = CollectionAll;
