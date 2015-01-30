var
	r = require('ramda');

function sum(a,b){
	return a+b;
}

var counterButton = {
	name: 'counterButton',
	type: 'button',
	state: function(props, domEvents) {
		return {
			text: props.map(r.prop('text')),
			count: props.map(r.prop('count')).flatMap(function(initialCount) { return domEvents.filter(r.propEq('name', 'inc')).map(1).scan(initialCount, sum); })
		}
	},
	props: {
		onClick: 'inc'
	},
	children: function(state){
		return [state.text, state.count].join(' ');
	}
}

module.exports = counterButton;