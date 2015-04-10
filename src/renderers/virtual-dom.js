var hyprComponent = require('../component'),
	rafScheduler = require('../raf-scheduler'),
	utils = require('../utils');

module.exports = function(virtualDom) {
	function renderElement(element, component, isComponentRootElement){
		return element == null || typeof element === 'string' ?
			element :
			typeof element === 'number' ?
				element.toString() :
				utils.isArray(element) ?
					element.map(function(element) {
						return renderElement(element, component)
					}) :
					utils.isFunction(element.type) ?
						renderElement(element.type(element.props || {}), component) :
						typeof element.type === 'string' ?
							virtualDom.h(
								element.type,
								utils.mixin(
									injectEventHandlers(
										element.props || {},
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
				createComponent(id, spec, props),
			 view = createView(spec, component);

		component.pushProps(props);
		component.render = parent.render;

		if ( parent != null && id != null) {
			parent.nextChildren = parent.nextChildren || {};
			parent.nextChildren[component.id] = component;
		}

		if ( component.onUpdate  != null ) {
			setTimeout(function () {
				component.onUpdate();
			}, 0);
		}

		return view(component.getState());
	}

	function createComponent(id, spec, initialProps) {
		var component = hyprComponent(spec, initialProps, id),
			firstRender = true,
			state;

		component.onMount = function() {
			if (utils.isFunction(spec.onMount)) {
				spec.onMount(component.element, component.getState(), component.domEventStream);
			}
		};
		component.onUpdate = function() {
			if (component.nextChildren != null) {
				utils.map(
					function(componentId){
						//TODO OnUnmount
						if ( component.nextChildren[componentId] == null) {
							component.children[componentId].dispose();
						}
					},
					utils.keys(component.children || {})
				);

				component.children = component.nextChildren;
				component.pushChildren(component.nextChildren);
				component.nextChildren = null;
			}
			if (component.element != null && utils.isFunction(spec.onUpdate)) {
				spec.onUpdate(component.element, component.getState(), component.domEventStream);
			}
		};
		component.getState = function() { return state };
		component.state.onValue(function(s) {
			state = s;
			if ( !firstRender && utils.isFunction(component.render) ) {
				component.render();
			}
		});
		firstRender = false;

		return component
	}

	function createView(spec, component){
		return function(state) {
			return renderElement({
					type: utils.applyOrReturn(spec.type, state),
					props: utils.applyOrReturn(spec.props, state),
					children: utils.applyOrReturn(spec.children, state)
				},
				component,
				true
			)
		}
	}

	return function render(element, mountNode, callback) {
		var	requestRender = rafScheduler(),
			requestRootRender = function() {
				requestRender(function() {
					renderRoot(rootComponent.getState());
				})
			},
			rootComponent = createComponent(null, element.type, element.props),
			rootView = createView(element.type, rootComponent);

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

		rootComponent.render = requestRootRender;
		requestRootRender();

		return rootComponent;
	};
}

function ElementHook(component) {
	this.component = component;
	this.mounted = false;
}

ElementHook.prototype.hook = function (element, propName) {
	var self = this,
		component = this.component;

	component.element = element;

	setTimeout(function() {
		if ( !self.mounted ) {
			component.onMount();
			self.mounted = true;
		}
		component.onUpdate();
	}, 0);
};

function injectEventHandlers(props, domEventStream, component) {
	return utils.mixin(
		utils.mapObject(
			function(key, value) {
				return key.indexOf('on') == 0 ?
					[
						key.toLowerCase(),
						function eventHandler(event) {
							event.stopPropagation();
							domEventStream.push(
								utils.isFunction(value) ?
									value(event) :
									value
							)
						}
					] :
					[key, value]
			},
			props
		),
		component != null ?
			{
				'ev-update': component.updateHook != null ?
					component.updateHook :
					(component.updateHook = new ElementHook(component))
			}:
			{}
	);
}