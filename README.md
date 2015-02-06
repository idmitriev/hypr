# hypr

[![Join the chat at https://gitter.im/idmitriev/hypr](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/idmitriev/hypr?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM version][1]][2]
[![Davis Dependency status][3]][4]
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)

Build UI components with reactive state. Render with react, virtual-dom or mithril.

## Example

```js
var
	hypr = require('hypr'),
	react = require('react'),
	virtualDom = require('virtual-dom'),
	mithril = require('mithril'),
	r = require('ramda');

function sum(a,b){
	return a+b;
}

var counterButon = {
	name: 'counterButton',
	type: 'button',
	state: function(props, domEvents) {
		return {
			text: props.map(r.prop('text')),
			count: domEvents.filter(r.propEq('name', 'inc')).map(1).scan(0, sum)
		}
	},
	props: {
		onClick: 'inc'
	},
	children: function(state){
		return [state.text, state.count].join(' ');
	}
}

window.onload = function(){
	hypr([react, virtualDom, mithril][Math.floor(Math.random()*3)])
	(counterButon, { text: 'like' }, document.body)
}
```

[1]: https://badge.fury.io/js/hypr.svg
[2]: https://badge.fury.io/js/hypr
[3]: https://david-dm.org/idmitriev/hypr.svg
[4]: https://david-dm.org/idmitriev/hypr