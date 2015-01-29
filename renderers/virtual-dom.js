var
	hypr = require('../hypr.js'),
	utils = require('../utils.js');

module.exports = function(virtualDom) {
	function renderElement(element, component, isComponentRootElement){
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
								injectEventHandlers(
									element.props,
									component.domEventStream,
									isComponentRootElement ?
										component :
										null
								),
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

		component.pushProps(props);
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
				component,
				true
			)
		}
	}

	return function render(spec, props, mountNode, callback) {
		var	requestRedraw = hypr.renderingScheduler(),
				requestRootRedraw = function() {
					requestRedraw(function() {
						renderRoot(rootComponent.getState());
					})
				},
				rootComponent = createComponent(null, spec, props),
				rootView = createView(spec, rootComponent);

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

				if (utils.isFunction(callback)){
					callback(rootComponent);
				}
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
		utils.map(
			function(componentId){
				if ( parent.nextChildren[componentId] == null) {
					parent.children[componentId].dispose();
				}
			},
			utils.keys(parent.children || {})
		);

		parent.children = parent.nextChildren;
		parent.pushChildren(parent.nextChildren);
		parent.nextChildren = null;
	}
	if ( parent.onMount != null || parent.onUpdate ){
		setTimeout(function() {
			if ( !self.mounted && parent.onMount != null ) {
				parent.onMount(element, parent.getState(), parent.domEventStream);
				self.mounted = true;
			}
			parent.onUpdate && parent.onUpdate(element, parent.getState(), parent.domEventStream);
		}, 0)
	}
}

function injectEventHandlers(props, domEventStream, parentComponent) {
	return utils.mixin(
		utils.mapObject(
			function(key, value) {
				return key.indexOf('on') == 0 ?
					[key.toLowerCase(), function eventHandler(event) {
						event.stopPropagation();
						domEventStream.push(
							utils.mixin(
								event,
								typeof value === 'string' ?
									{ name: value } :
									value
							)
						)
					}] :
					[key, value]
			},
			props
		),
		parentComponent != null ?
			{
				'ev-update': parentComponent.updateHook != null ?
					parentComponent.updateHook :
					(parentComponent.updateHook = new ElementHook(parentComponent))
			}:
			{}
	);
}