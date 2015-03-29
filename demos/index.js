var
	hypr = require('../src'),
	react = require('react'),
	virtualDom = require('virtual-dom'),
	mithril = require('mithril'),
	counterButton = require('./components/counterButton'),
	videoPlayer = require('./components/videoPlayer');

window.onload = function(){
	[react, virtualDom, mithril].map(function(r, i){
		hypr(r)(
			counterButton({
				text: (['react', 'virtualDom', 'mithril'])[i],
				count: i
			}),
			document.querySelector('#button'+i)
		).state.log((['react', 'virtualDom', 'mithril'])[i] + '-counter-button');
	});

	hypr(mithril)(
		videoPlayer({
			playbackState: 'playing',
			src: 'http://www.w3schools.com/html/mov_bbb.mp4',
			currentTime: 5
		}),
		document.querySelector('#video')
	).state.log('videoPlayer');
}

