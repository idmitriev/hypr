var
	hypr = require('../../src/hypr'),
	r = require('ramda');

module.exports = hypr.component({
	name: 'video',
	type: 'video',
	propDefaults: {
		src: null,
		width: '100%',
		height: '100%',
		currentTime: 0,
		playbackRate: 1,
		volume: 1,
		loop: false,
		playbackState: 'loading'
	},
	state: function(props, domEvents) {
		return {
			src: props.map(r.prop('src')),
			width: props.map(r.prop('width')),
			height: props.map(r.prop('height')),
			currentTime: domEvents
				.filter(r.propEq('name', 'timeupdate'))
				.map(r.prop('currentTime'))
				.merge(props.map(r.prop('currentTime')).changes())
				.toProperty(0),
			playbackRate: props.map(r.prop('playbackRate')),
			volume: props.map(r.prop('volume')),
			loop: props.map(r.prop('loop')),
			playbackState: hypr.stream.mergeAll(
				props.map(r.prop('playbackState')),
				domEvents.filter(r.eq('playing')).map('playing'),
				domEvents.filter(r.eq('pause')).map('pause'),
				domEvents.filter(r.eq('ended')).map('ended')
			),
			duration: domEvents
				.filter(r.propEq('name', 'durationchange'))
				.map(r.prop('duration'))
				.toProperty(0)
		}
	},
	onMount: function(element, state, domEventStream) {
		return r.mapObjIndexed(function(data, attr) {
				return element.addEventListener(
					attr.substr(2),
					function (event) {
						domEventStream.push(
							typeof data === 'function' ?
								data(event) :
								data
						)
					}
				)
			},{
				ondurationchange: function(event){
					return {
						name: 'durationchange',
						duration: event.target.duration
					}
				},
				onended: 'ended',
				onerror: 'error',
				onpause: 'pause',
				onplay: 'play',
				onplaying: 'playing',
				ontimeupdate: function(event){
					return {
						name: 'timeupdate',
						currentTime: event.target.currentTime
					}
				}
			}
		);
	},
	onUpdate: function(element, state) {
		if( Math.abs(element.currentTime - state.currentTime) > 1){
			element.currentTime = state.currentTime;
		}
		if (element.playbackRate != state.playbackRate) {
			element.playbackRate = state.playbackRate;
		}
		if ( state.playbackState == 'playing' ){
			element.play()
		} else if ( state.playbackState == 'pause' ){
			element.pause();
		}
	},
	props: function(state) {
		return {
			src: state.src,
			width: state.width,
			height: state.height,
			volume: state.volume,
			loop: state.loop,
			style: {
				width: state.width,
				height: state.height
			}
		}
	}
});
