# abortable.js

# Abortable promises

## Current status

[![NPM version](https://img.shields.io/npm/v/abortable.svg)](https://www.npmjs.com/package/abortable)
[![Build Status](https://img.shields.io/travis/overlookmotel/abortable/master.svg)](http://travis-ci.org/overlookmotel/abortable)
[![Dependency Status](https://img.shields.io/david/overlookmotel/abortable.svg)](https://david-dm.org/overlookmotel/abortable)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/abortable.svg)](https://david-dm.org/overlookmotel/abortable)
[![Greenkeeper badge](https://badges.greenkeeper.io/overlookmotel/abortable.svg)](https://greenkeeper.io/)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/abortable/master.svg)](https://coveralls.io/r/overlookmotel/abortable)

## What is an abortable?

An abortable is a promise which can be aborted.

Aborting means stopping the task that the abortable represents as soon as possible.

Like promises, which are defined as any object with a `.then()` method which has certain behavior, an abortable is not an instance of any particular class, but any object which has certain characteristics.

An implementation of an abortable should be able to interoperate with any other abortable, as long as it has the characteristics of an abortable as defined below.

This module is an implementation of the spec defined below.

### Characteristics of an abortable

An abortable:

1. Is an object.
2. Has a `.then()` method which satisfies the Promise spec.
3. Can be constructed like a Promise, but with extra `onAbort()` callback passed into the executor function (see below).
4. Has an `.abort()` method with a defined behavior (see below).

### Constructor

An abortable is created like a promise, but with an additional `onAbort` argument passed to the executor function.

```js
const abortable = new Abortable( (resolve, reject, onAbort) => {
  // ...
} );
```

### `onAbort( handler )`

`onAbort()` can be called to register a handler for abort events on the promise. `onAbort()` can be called at any time, but must only be called once.

If the abortable receives an abort signal, the handler will be called with the abort error `err`. The handler will only be called once. The handler will only be called if the abortable is in a pending state i.e. `resolve()` or `reject()` has not already been called.

The handler can choose how to handle the abort signal. Usual behavior would be to stop the ongoing task as quickly as possible, clear up any resources, and call the `reject()` handler with the abort error. The Abortable will be rejected with the error, which can be handled with `.catch()` as usual.

If the task is at a point where it is too late (or inefficient) to stop, the handler can choose to ignore the abort signal.

If the Abortable has been aborted already and then `onAbort()` is called, the handler will be called immediately.

```js
const abortable = new Abortable( (resolve, reject, onAbort) => {
  /* Start task ... */

  onAbort( (err) => {
	/* Stop task and clean up resources ... */

	reject(err); // Signal abort successful
  });
} );
```

### `.abort( error, unilateral )`

* `error` is the error that the abortable which accepts the abort signal will reject with.
* `unilateral` if `true` will unilaterally abort with no regard to whether other followers have requested an abort.

### Abort propogation



## Usage


## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

## Changelog

See [changelog.md](https://github.com/overlookmotel/abortable/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/abortable/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add an entry to changelog
* add tests for new features
* document new functionality/API additions in README
