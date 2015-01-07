var
	hypr = require('../hypr'),
	utils = require('../utils');

module.exports = function(virtualDom) {
	function renderElement(element, component){
		return element == null || typeof element === 'string' ?
			element :
			typeof element === 'number' ?
				element.toString() :
				utils.isArray(element) ?
					element.map(function(element) { return renderElement(element, component) }) :
					typeof element.type === 'string' ?
						virtualDom.h(
							element.type,
							utils.mixin(
								injectEventHandlers(element.props, component, component.onMount),
								element.id ?
									{ key: element.id } :
									{}
							),
							renderElement(element.children, component)
						) :
						renderComponent(element.id, element.type, element.props, component)
	}

	function renderComponent(id, spec, props, parent) {
		var component = parent != null && id != null && parent.children != null && parent.children[id] != null ?
				parent.children[id] :
				createComponent(id, spec, props, parent.redraw),
			 view = createView(spec, component);

		component.pushProps(utils.mixin(spec.defaults, props));
		component.redraw = parent.redraw;

		if ( parent != null && id != null) {
			parent.nextChildren = parent.nextChildren || {};
			parent.nextChildren[component.id] = component;
		}

		return view(component.getState());
	}

	function createComponent(id, spec, initialProps) {
		var
			component = hypr.component(spec, initialProps, id),
			firstRender = true,
			state;

		component.onMount = spec.onMount;
		component.onUpdate = spec.onUpdate;
		component.getState = function() { return state };
		component.state.onValue(function(s) {
			state = s;
			if ( !firstRender && component.redraw != null ) {
				component.redraw();
			}
		});
		firstRender = false;

		return component
	}

	function createView(spec, component){
		return function(state) {
			return renderElement({
					type: typeof spec.type === 'function' ? spec.type(state) : spec.type,
					props: typeof spec.props === 'function' ? spec.props(state) : spec.props,
					children: typeof spec.children === 'function' ? spec.children(state) : spec.children
				},
				component
			)
		}
	}

	return function render(componentSpec, initialProps, mountNode) {
		var	requestRedraw = hypr.renderingScheduler(),
				requestRootRedraw = function() {
					requestRedraw(function() {
						renderRoot(rootComponent.getState());
					})
				},
				rootComponent = createComponent(null, componentSpec, initialProps),
				rootView = createView(componentSpec, rootComponent);

		var tree,
			rootNode;
		function renderRoot(state){
			var newTree = rootView(state);
			if(tree != null && rootNode != null ) {
				var patches = virtualDom.diff(tree, newTree);
				rootNode = virtualDom.patch(rootNode, patches);
			} else {
				rootNode = virtualDom.create(newTree);
				mountNode.innerHTML = '';
				mountNode.appendChild(rootNode);
			}
			tree = newTree;
		}

		rootComponent.redraw = requestRootRedraw;
		requestRootRedraw();

		return rootComponent;
	};
}

function ElementHook(parent) {
	this.parent = parent;
	this.mounted = false;
}

ElementHook.prototype.hook = function (element, propName) {
	var
		self = this,
		parent = this.parent;

	if ( parent.nextChildren != null ) {
		parent.children = parent.nextChildren;
		parent.pushChildren(parent.nextChildren);
		parent.nextChildren = null;
		//TODO dispose old components
	}
	if ( parent.onMount != null || parent.onUpdate ){
		setTimeout(function() {
			if ( !self.mounted && parent.onMount != null ) {
				console.log('mount', element);
				parent.onMount(element, parent.getState(), parent.domEventStream);
				self.mounted = true;
			} else {
				console.log('update', element);
				parent.onUpdate && parent.onUpdate(element, parent.getState(), parent.domEventStream);
			}
		}, 0)
	}
}

function injectEventHandlers(props, parentComponent) {
	return utils.mixin(
		utils.mapObject(
			function(key, value) {
				return key.indexOf('on') == 0 ?
					[key.toLowerCase(), function eventHandler(event) {
						event.stopPropagation();
						parentComponent.domEventStream.push(utils.mixin(event, typeof value === 'string' ? {name: value} : value))
					}] :
					[key, value]
			},
			props
		),
		{ 'ev-update': new ElementHook(parentComponent) }
	);
}