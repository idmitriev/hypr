var
	hypr = require('../hypr'),
	utils = require('../utils');

module.exports = function(mithril) {
	function renderElement(element, component, onMount) {
		return element == null || typeof element === 'string' || typeof element === 'number' ?
			element :
			utils.isArray(element) ?
				element.map(function(element) { return renderElement(element, component) }) :
				typeof element.type === 'string' ?
					mithril(
						element.type,
						utils.mixin(injectEventHandlers(element.props, component.domEventStream, onMount), element.id ? { key: element.id } : {}),
						renderElement(element.children, component)
					) :
					renderComponent(element.id, element.type, element.props, component)
	}

	function createView(spec, component){
		return function(state) {
			return renderElement({
					id: component.id,
					type: typeof spec.type === 'function' ? spec.type(state) : spec.type,
					props: typeof spec.props === 'function' ?
						spec.props(state) :
						spec.props,
					children: typeof spec.children === 'function' ? spec.children(state) : spec.children
				},
				component,
				function (element, isInit) {
					if (!isInit) {
						spec.onMount && spec.onMount(element, state, component.domEventStream)
					} else {
						spec.onUpdate && spec.onUpdate(element, state)
					}

					if (component.nextChildren != null) {
						component.children = component.nextChildren;
						component.nextChildren = null;
						component.pushChildren(component.children);
						//TODO dispose old components
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

		component.pushProps(utils.mixin(spec.defaults, props));
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
						domEventStream.push(utils.mixin(event, typeof value === 'string' ? {name: value} : value))
					}] :
					[key, value]
				},
				props
			),
			onMount != null ?
				{ config:  onMount } :
				{ }
		);
	}

	return function render(spec, props, mountNode) {
		var
			renderingScheduler = hypr.renderingScheduler(),
			renderRoot = function() {
				renderingScheduler(function() {
					mithril.render(mountNode, rootView(rootComponent.getState()))
				});
			},
			rootComponent = createComponent(props.id, spec, props),
			rootView = createView(spec, rootComponent);

		rootComponent.render = renderRoot;
		renderRoot();

		return rootComponent;
	};
}
