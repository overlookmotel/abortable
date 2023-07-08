# TODO

* AbortError subclass for abort due to collection completion?
* Tests for Collections awaiting all promises if iteration error and `await` option set
* Collections handle where getting `.abort` or `[IS_ABORTABLE]` properties throws error
* Collections handle where calling `.abort()` throws error
* `toAbortable()` handle where getting `[IS_ABORTABLE]` property throws error
* Simplify handling internal then calls?
* `.abort()` called on promise directly unilaterally abort, regardless of number of `.then()` calls
* `.finally` method

* Deal with case:

```js
const pInner = new Abortable((resolve, reject, onAbort) => {
	onAbort((err) => {
		console.log('aborted');
		reject(err);
	});
});

let p2, pThen;
const p1 = new Abortable((resolve1) => {
	p2 = new Abortable((resolve2) => {
		resolve1(pInner);
		Promise.resolve().then(() => pThen = pInner.then(v => v));
		resolve2(pInner);
	});
});

p1.abort();
p2.abort();
pThen.abort();
// `pInner` should abort at this point, but I think it won't due to `pInner.then()` being wrongly
// identified as an internal `.then()` call
```
