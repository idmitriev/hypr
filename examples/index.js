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

window.onload = function(){
	[react, virtualDom, mithril].map(function(r,i){
		hypr(r)(counterButon, { text: 'like', count: i }, document.querySelector('#button'+i));
	})
}

