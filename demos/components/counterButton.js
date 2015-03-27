var
	hypr = require('../../src/hypr'),
	r = require('ramda');

function sum(a,b){
	return a+b;
}

var counterButton = hypr.component({
	name: 'counterButton',
	type: 'button',
	state: function(props, domEvents) {
		return {
			text: props.map(r.prop('text')),
			count: props.map(r.prop('count')).flatMap(function(initialCount) { return domEvents.filter(r.eq('inc')).map(1).scan(initialCount, sum); })
		}
	},
	props: {
		onClick: 'inc'
	},
	children: function(state){
		return [state.text, state.count].join(' ');
	}
});

module.exports = counterButton;