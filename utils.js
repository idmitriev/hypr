module.exports = {
	mixin: mixin,
	randomString: randomString,
	mapObject: mapObject,
	isArray: isArray,
	mapValues: mapValues,
	haveSameKeys: haveSameKeys,
	pick: pick,
	isFunction: isFunction,
	applyOrReturn: applyOrReturn,
	singleArgMemoize: singleArgMemoize
};

function singleArgMemoize(fn) {
	var knownArguments = [],
		results = [];

	return function(){
		var argument = arguments[0],
			argumentIndex = knownArguments.indexOf(argument);

		if ( argumentIndex != -1 ){
			return results[argumentIndex];
		} else {
			var newResult = fn(argument);
			results = results.concat(newResult);
			var resultIndex = results.indexOf(newResult);
			knownArguments[resultIndex] = argument;
			return newResult;
		}
	}
}

function applyOrReturn(obj, args){
	return isFunction(obj) ? obj.apply(null, [args]) : obj;
}

function isFunction(obj){
	return typeof obj === 'function';
}

function randomString(length) {
	length = length || 8;
	var	alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	return times(function() {
			return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
		},
		length
	).join('');
}

function pick(keysToPick, o){
	return reduce(function(acc, key){
			if ( contains(key, keysToPick)){
				acc[key] = o[key];
			}
			return acc;
		},
		{},
		keys(o)
	)
}

function contains(value, list){
	return list.indexOf(value) != -1;
}

function mapValues(fn, o){
	return mapObject(function(key, value){
		return [key, fn(value)];
		},
		o
	);
}

function mapObject(fn, o) {
	return reduce(function(obj, key) {
			var res = fn(key, o[key]);
			obj[res[0]] = res[1];
			return obj;
		},
		{},
		keys(o)
	)
}

function haveSameKeys(o1, o2) {
	if (o1 == null || o2 == null ){
		return false;
	}

	var k1 = keys(o1),
		k2 = keys(o2);

	k1.sort(); k2.sort();

	return k1.length === k2.length && every(function(v,i) {
			return k2[i] === v;
		},
		k1
	);
}

function times(fn, n) {
	var
		list = new Array(Number(n)),
		len = list.length,
		idx = -1;
	while (++idx < len) {
		list[idx] = fn(idx);
	}
	return list;
}

var keys = (function() {
	'use strict';
	var hasOwnProperty = Object.prototype.hasOwnProperty,
		hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
		dontEnums = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor'
		],
		dontEnumsLength = dontEnums.length;

	return Object.keys || function keys(obj) {
		if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
			throw new TypeError('Object.keys called on non-object');
		}

		var result = [], prop, i;

		for (prop in obj) {
			if (hasOwnProperty.call(obj, prop)) {
				result.push(prop);
			}
		}

		if (hasDontEnumBug) {
			for (i = 0; i < dontEnumsLength; i++) {
				if (hasOwnProperty.call(obj, dontEnums[i])) {
					result.push(dontEnums[i]);
				}
			}
		}
		return result;
	}
})();

function every(predicate, list) {
	if ( Array.prototype.every ){
		return list.every(predicate)
	}

	var i, iterable;
	for (i = 0, iterable = list; i < iterable.length; i++)
		if (!predicate.call(this, iterable[i], i, iterable))
			return false;
	return true;
}

function mixin() {
	return assign.apply(this, [{}].concat(toArray(arguments)));
}

function assign(target, firstSource) {
	if (Object.assign ){
		return Object.assign.apply(Object, toArray(arguments));
	}
	"use strict";
	if (target === undefined || target === null)
		throw new TypeError("Cannot convert first argument to object");
	var to = Object(target);
	for (var i = 1; i < arguments.length; i++) {
		var nextSource = arguments[i];
		if (nextSource === undefined || nextSource === null) continue;
		var keysArray = keys(Object(nextSource));
		for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
			var nextKey = keysArray[nextIndex];
			var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
			if (desc !== undefined && desc.enumerable) to[nextKey] = nextSource[nextKey];
		}
	}
	return to;
};

function isArray(o) {
	return Array.isArray && Array.isArray(o) || Object.prototype.toString.call(o) === '[object Array]';
}

function map(fn, list) {
	return reduce(function(acc, item){
		return acc.concat(fn.apply(this, item));
	}, [], list);
}

function reduce(callback, initialValue, list) {
	'use strict';

	if ( Array.prototype.reduce ){
		return Array.prototype.reduce.apply(list, [callback, initialValue]);
	}

	var t = Object(list), len = t.length >>> 0, k = 0, value;
	if (arguments.length == 2) {
		value = arguments[1];
	} else {
		while (k < len && ! k in t) {
			k++;
		}
		if (k >= len) {
			throw new TypeError('Reduce of empty array with no initial value');
		}
		value = t[k++];
	}
	for (; k < len; k++) {
		if (k in t) {
			value = callback(value, t[k], k, t);
		}
	}
	return value;
}

function toArray(o){
	return Array.prototype.slice.call(o);
}