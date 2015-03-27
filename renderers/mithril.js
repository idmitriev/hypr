var
	hypr = require('../hypr.js'),
	utils = require('../utils.js');

module.exports = function(mithril) {
	function renderElement(element, component, onMount) {
		return element == null || typeof element === 'string' || typeof element === 'number' ?
			element :
			utils.isArray(element) ?
				element.map(function(element) {
					return renderElement(element, component)
				}) :
				typeof element.type === 'string' ?
					mithril(
						element.type,
						utils.mixin(
							injectEventHandlers(element.props, component.domEventStream, onMount),
							element.id ?
								{ key: element.id } :
								{}
						),
						renderElement(element.children, component)
					) :
					renderComponent(element.id, element.type, element.props, component)
	}

	function createView(spec, component){
		return function(state) {
			return renderElement({
					id: component.id,
					type: utils.applyOrReturn(spec.type, state),
					props: utils.applyOrReturn(spec.props, state),
					children: utils.applyOrReturn(spec.children, state)
				},
				component,
				function (element, isInit) {
					if (!isInit) {
						spec.onMount && spec.onMount(element, state, component.domEventStream)
					} else {
						spec.onUpdate && spec.onUpdate(element, state)
					}

					if (component.nextChildren != null) {
						utils.map(
							function(componentId){
								if ( parent.nextChildren[componentId] == null) {
									parent.children[componentId].dispose();
								}
							},
							utils.keys(parent.children || {})
						);

						component.children = component.nextChildren;
						component.nextChildren = null;
						component.pushChildren(component.children);
					}
				}
			);
		}
	}

	function renderComponent(id, spec, props, parent) {
		var
			component = id != null && parent != null && parent.children != null && parent.children[id] != null ?
				parent.children[id] :
				createComponent(id, spec, props),
			view = createView(spec, component);

		component.pushProps(props);
		component.render = parent.render;

		if ( parent != null && id != null ) {
			parent.nextChildren = parent.nextChildren || {};
			parent.nextChildren[id] = component;
		}

		return view(component.getState());
	}

	function createComponent(id, spec, initialProps) {
		var
			state,
			component = hypr.component(spec, initialProps, id);

		component.getState = function() { return state; };
		component.state.onValue(function(s) {
			state = s;
			if (utils.isFunction(component.render)){
				component.render()
			}
		});

		return component;
	}

	function injectEventHandlers(props, domEventStream, onMount) {
		return utils.mixin(
			utils.mapObject(function(key, value) {
				return key.indexOf('on') == 0 ?
					[key.toLowerCase(), function eventHandler(event) {
						event.stopPropagation();
						domEventStream.push(
							utils.isFunction(value) ?
								value(event) :
								value
						)
					}] :
					[key, value]
				},
				props
			),
			onMount != null ?
				{ config:  onMount } :
				{}
		);
	}

	return function render(element, mountNode, callback) {
		var
			renderingScheduler = hypr.renderingScheduler(),
			renderRoot = function() {
				renderingScheduler(function() {
					mithril.render(mountNode, rootView(rootComponent.getState()));

					if ( utils.isFunction(callback) ){
						callback(rootComponent);
						callback = null;
					}
				});
			},
			rootComponent = createComponent(element.props.id, element.type, element.props),
			rootView = createView(element.type, rootComponent);

		rootComponent.render = renderRoot;
		renderRoot();

		return rootComponent;
	};
};
