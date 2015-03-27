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
		utils.isFunction(rendererLib) && rendererLib.module != null ?
			mithrilRenderer :
			rendererLib.h != null && rendererLib.diff != null && rendererLib.patch != null && rendererLib.create != null ?
				virtualDomRenderer :
				function() {
					throw new Error('Rendering library not supported');
				}
		)(rendererLib);
}

hypr.element = hypr.e = function element(tag, props, children){
	var
		parsed = typeof tag === 'string' ?
			parseTag(tag) :
			{};
	return {
		id: props.id != null ?
			props.id :
			parsed.id != null ?
				parsed.id :
				undefined,
		type: parsed.tagName != null ?
			parsed.tagName :
			tag,
		props: utils.mixin(
			props,
			parsed.className != null ?
				{ class: parsed.className } :
				{}
		),
		children: children == null && typeof props !== 'object' ?
			props :
			children
	}
};

hypr.component = function component(spec, initialProps, id){
	if ( arguments.length === 1) {
		return function component(props) {
			return hypr.element(spec, props);
		}
	}

	id = id == null ?
		utils.randomString() :
		id;
	initialProps = utils.mixin(spec.propDefaults || {}, initialProps || {});
	var
		childrenStream = new stream.Bus(),
		propStream = new stream.Bus(),
		domEventStream = new stream.Bus(),
		stateStream = new stream.Bus(),
		children = childrenStream.toProperty({}).skipDuplicates(utils.haveSameKeys),
		props = propStream.scan(
			initialProps,
			function(acc, next) {
				return utils.mixin(acc, next);
			}
		),
		events = utils.isFunction(spec.events) ?
			spec.events(props, domEventStream, children) :
			{},
		state = stateStream.skipDuplicates(deepEqual).toProperty(),
		stateSpec = spec.state(props, domEventStream, children);

	stateStream.plug(utils.isFunction(stateSpec.onValue) ?
		stateSpec :
		stream.combineTemplate(stateSpec)
	);

	return {
		id: id,
		pushProps: function(props) {
			propStream.push(props);
			return this;
		},
		plugProps: function(props) {
			return propStream.plug(props);
		},
		pushChildren: function(children) {
			childrenStream.push(children);
			return this;
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
			return this;
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
};

function parseTag(tag){
	var
		idRx = /#[a-zA-Z0-9_:-]+/,
		classRx = /\.([a-zA-Z0-9_:-]+)/g,
		id = tag.match(idRx) != null ?
			tag.match(idRx)[0] :
			undefined,
		className = tag.match(classRx) != null ?
			tag.match(classRx).join(' ').replace('.', '') :
			undefined,
		tagName = tag.split(/[#|\.]/)[0];

	return {
		id: id,
		className: className,
		tagName: tagName
	};
}

hypr.html = utils.reduce(function(html, tagName){
		html[tagName] = function(props, children) {
			return hypr.element(tagName, props, children);
		};
		return html;
	},
	{},
	['a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe','img','input','ins','kbd','keygen','label','legend','li','link','main','map','mark','menu','menuitem','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','pre','progress','q','rb','rp','rt','rtc','ruby','s','samp','script','section','select','small','source','span','strong','style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track','u','ul','var','video','wbr']
);

hypr.stream = stream;

module.exports = hypr;