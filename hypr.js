var
	stream = require('baconjs'),
	deepEqual = require('deep-equal'),
	raf = require('raf'),
	utils = require('./utils.js');

function hypr(rendererLib){
	var
		reactRenderer = require('./renderers/react.js'),
		mithrilRenderer = require('./renderers/mithril.js'),
		virtualDomRenderer = require('./renderers/virtual-dom.js');

	return (rendererLib.createClass != null && rendererLib.createElement != null && rendererLib.render != null ?
		reactRenderer :
		(typeof rendererLib === 'function' && rendererLib.module != null) ?
			mithrilRenderer :
			rendererLib.h != null && rendererLib.diff != null && rendererLib.patch != null && rendererLib.create != null ?
				virtualDomRenderer :
				function() { throw new Error('Rendering library not supported'); }
	)(rendererLib)
}

hypr.component = function component(spec, initialProps, id){
	id = id == null ? utils.randomString() : id;
	var
		childrenStream = new stream.Bus(),
		propStream = new stream.Bus(),
		domEventStream = new stream.Bus(),
		stateStream = new stream.Bus(),
		children = childrenStream.toProperty({}).skipDuplicates(utils.haveSameKeys),
		props = propStream.toProperty(utils.mixin(spec.propDefaults || {}, initialProps || {})),
		events = typeof spec.events === 'function' ?
			spec.events(props, domEventStream, children) :
			{},
		state = stateStream.skipDuplicates(deepEqual).toProperty(),
		stateSpec = spec.state(props, domEventStream, children);

	stateStream.plug(typeof stateSpec.onValue === 'function' ? stateSpec : stream.combineTemplate(stateSpec));

	return {
		id: id,
		pushProps: function(props) {
			propStream.push(props)
		},
		pushChildren: function(children) {
			childrenStream.push(children);
		},
		domEventStream: domEventStream,
		state: state,
		events: events,
		dispose: function() {
			[
				domEventStream,
				childrenStream,
				propStream,
				stateStream
			].map(function(stream){
				stream.end()
			});
		}
	}
};

hypr.renderingScheduler = function(){
	var renderScheduled = false,
		rendering = false,
		renderFn = null;

	function render(fn){
		renderFn = fn;
		if(!renderScheduled) {
			renderScheduled = true;
			raf(function() {
				renderScheduled = false;
				if ( !rendering ) {
					rendering = true;
					renderFn();
					rendering = false;
				}
			});
		}
	}

	return render;
}

module.exports = hypr;