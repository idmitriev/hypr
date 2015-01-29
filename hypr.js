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
		)(rendererLib);
}

hypr.component = function component(spec, initialProps, id){
	id = id == null ? utils.randomString() : id;
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
		events = typeof spec.events === 'function' ?
			spec.events(props, domEventStream, children) :
			{},
		state = stateStream.skipDuplicates(deepEqual).toProperty(),
		stateSpec = spec.state(props, domEventStream, children);

	stateStream.plug(typeof stateSpec.onValue === 'function' ? stateSpec : stream.combineTemplate(stateSpec));

	return {
		id: id,
		pushProps: function(props) {
			propStream.push(props);
			return this;
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

function parseTag(tag){
	var
		idRx = /#[a-zA-Z0-9_:-]+/,
		classRx = /\.([a-zA-Z0-9_:-]+)/g,
		id = tag.match(idRx) != null ?
			tag.match(idRx)[0] :
			null,
		className = tag.match(classRx) != null ?
			tag.match(classRx).join(' ').replace('.', '') :
			null,
		tagName = tag.split(/[#|\.]/)[0];

	return { id: id, className: className, tagName: tagName };
}

hypr.element = hypr.e = function(tag, props, children){
	var
		_id,
		_tagName = 'div',
		_props = {},
		_children = [];

	if ( !children && typeof props === 'object' ){
		_children = props;
	}

	var parsed = parseTag(tag);

	_id = props.id;
	if ( parsed.id != null ){
		_id = parsed.id;
	}

	if ( parsed.className != null ){
		_props.className = parsed.className;
	}

	return { id: _id, type: _tagName, props: _props, children: _children };
}


utils.forEach(
	function(tagName){
		hypr[tagName] = function(props, children) {
			return hypr.element(tagName, props, children);
		}
	},
	['a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe','img','input','ins','kbd','keygen','label','legend','li','link','main','map','mark','menu','menuitem','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','pre','progress','q','rb','rp','rt','rtc','ruby','s','samp','script','section','select','small','source','span','strong','style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track','u','ul','var','video','wbr']
);


module.exports = hypr;