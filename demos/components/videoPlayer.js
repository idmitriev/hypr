var
	hypr = require('../../src/hypr'),
	video = require('./video'),
	r = require('ramda');

function notNull(o){
	return o != null;
}

var videoPlayer = hypr.component({
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
			video(
				r.merge(
					{ id: 'video' },
					r.pick(['src', 'playbackState', 'currentTime'], state)
				)
			),
			hypr.html.button({
					style: {
						position: 'absolute',
						bottom: 5,
						left: 5,
						width: 30,
						height: 15
					},
					onclick: 'playPause'
				}, state.playbackState == 'playing' ? '||' : '>'
			),
			hypr.html.div({
				style: {
					position: 'absolute',
					bottom: 5,
					left: 40,
					height: 15,
					width: 435,
					background: '#000'
				},
				onclick: function(e) {
					return {
						name: 'seek',
						progress: (e.nativeEvent || e).layerX / (e || e.nativeEvent).currentTarget.clientWidth
					}
				}
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
						domEvents.filter(r.eq('playPause'))
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
					null,
					[
						domEvents
							.filter(r.propEq('name', 'seek'))
							.map(r.prop('progress'))
							.map(parseFloat)
							.map(function(progress) {
								return progress > 1 ?
									1 :
									progress < 0 || isNaN(progress) || !isFinite(progress) ?
										0 :
										progress;
							}),
						duration
					],
					function(currentTime, progress, duration){
						return progress * duration;
					}
				).filter(notNull)
			).toProperty(0),
			duration: duration
		}
	}
});

module.exports = videoPlayer;
