var
	hypr = require('../hypr'),
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

