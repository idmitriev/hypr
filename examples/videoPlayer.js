var
	hypr = require('../hypr'),
	r = require('ramda');

var video = {
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
	state: function(props, domEvents, events) {
		return {
			src: props.map(r.prop('src')),
			width: props.map(r.prop('width')),
			height: props.map(r.prop('height')),
			currentTime: domEvents
				.filter(r.propEq('name','timeupdate'))
				.map(r.prop('target'))
				.map(r.prop('currentTime'))
				.merge(props.map(r.prop('currentTime')).changes())
				.toProperty(0),
			playbackRate: props.map(r.prop('playbackRate')),
			volume: props.map(r.prop('volume')),
			loop: props.map(r.prop('loop')),
			playbackState: hypr.stream.mergeAll(
				props.map(r.prop('playbackState')),
				domEvents.filter(r.propEq('name', 'playing')).map('playing'),
				domEvents.filter(r.propEq('name', 'pause')).map('pause'),
				domEvents.filter(r.propEq('name', 'ended')).map('ended')
			),
			duration: domEvents
				.filter(r.propEq('name', 'durationchange'))
				.map(r.prop('target'))
				.map(r.prop('duration'))
				.toProperty(0)
		}
	},
	onMount: function(element, state, domEvents) {
		return r.toPairs({
			ondurationchange: 'durationchange',
			onended: 'ended',
			onerror: 'error',
			onpause: 'pause',
			onplay: 'play',
			onplaying: 'playing',
			ontimeupdate: 'timeupdate'
		}).forEach(function (pair) {
			return element.addEventListener(
				pair[0].substr(2),
				function (event) {
					domEvents.push(r.mixin(event, {name: pair[1]}))
				}
			)
		});
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
};

function notNull(o){
	return o != null;
}

var videoPlayer = {
	name: 'videoPlayer',
	type: 'div',
	props: {
		style: {
			width: 480,
			height: 270,
			position: 'relative'
		}
	},
	children: function(state){
		return [
			{ id: 'video', type: video, props: r.pick(['src', 'playbackState', 'currentTime'], state) },
			hypr.html.button({
				style: {
					position: 'absolute',
					bottom: 5,
					left: 5,
					width: 30,
					height: 15
				},
				onclick: 'playPause'
			}, state.playbackState == 'playing' ? '||' : '>'),
			hypr.html.div({
				style: {
					position: 'absolute',
					bottom: 5,
					left: 40,
					height: 15,
					width: 435,
					background: '#000'
				},
				onclick: 'seek'
			}, hypr.html.div({
				style: {
					height: 15,
					width: state.duration != 0 ?
					'' + (100 * state.currentTime / state.duration) + '%' :
						0,
					background: '#f00'
				}
			}))
		]
	},
	state: function(props, domEvents, children) {
		var duration = children.map(r.prop('video')).filter(notNull).flatMap(r.prop('state')).map(r.prop('duration')).toProperty(0);
		return {
			src: props.map(r.prop('src')),
			playbackState: hypr.stream.mergeAll(
				hypr.stream.update(
					'loading',
					[
						domEvents.filter(r.propEq('name', 'playPause'))
					],
					function(playbackState, _) {
						return playbackState === 'playing' ?
							'pause' :
							'playing'
					}
				),
				children.map(r.prop('video')).filter(notNull).flatMap(r.prop('state')).map(r.prop('playbackState'))
			),
			currentTime: hypr.stream.mergeAll(
				props.map(r.prop('currentTime')),
				children.map(r.prop('video')).filter(notNull).flatMap(r.prop('state')).map(r.prop('currentTime')),
				hypr.stream.update(
					0,
					[
						domEvents.filter(r.propEq('name', 'seek')).map(function(e){
							return (e.nativeEvent || e).layerX / (e || e.nativeEvent).currentTarget.clientWidth
						}).map(function(position) {
							return position > 1 ?
								1 :
								position < 0 ?
									0 :
									isNaN(parseFloat(position)) || !isFinite(position) ?
										0 :
										position;
						}),
						duration
					],
					function(currentTime, position, duration){
						return position * duration;
					}
				)
			),
			duration: duration
		}
	}
};

module.exports = videoPlayer;
