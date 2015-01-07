var
	stream = require('baconjs'),
	utils = require('../utils'),
	hypr = require('../hypr');

module.exports = function(react) {
	function createReactElement(spec, parentDomEventStream){
		return spec == null || typeof spec === 'string' || typeof spec === 'number' ?
			spec :
			utils.isArray(spec) ?
				spec.map(function(element){
					return createReactElement(element, parentDomEventStream)
				}) :
				react.createElement(
					typeof spec.type === 'string' ? spec.type : getOrCreateCreactClass(spec.type),
					translateAttributes(utils.mixin(parentDomEventStream != null ? injectEventHandlers(spec.props, parentDomEventStream) : spec.props, { ref: spec.id, key: spec.id })),
					createReactElement(spec.children, parentDomEventStream)
				);
	}

	function createReactClass(spec){
		return react.createClass({
			displayName: spec.name,
			getDefaultProps: function() {
				return spec.defaults || {};
			},
			componentWillMount: function() {
				var
					self = this,
					hyprComponent = hypr.component(spec, this.props, this.props.id);

				hyprComponent.state.onValue(function(state){
					return self.setState(state);
				});

				this._hyprComponent = hyprComponent;
			},
			componentDidMount: function() {
				this._hyprComponent.pushChildren(
					utils.mapValues(function(value){
						return value._hyprComponent != null ?
							utils.pick(['events', 'state'], value._hyprComponent) :
							{}
						},
						this.refs
					)
				);
				if (utils.isFunction(spec.onMount)) {
					spec.onMount(this.getDOMNode(), this.state, this._hyprComponent.domEventStream);
				}
			},
			componentWillReceiveProps: function(nextProps) {
				this._hyprComponent.pushProps(nextProps);
			},
			componentDidUpdate: function() {
				if (utils.isFunction(spec.onUpdate)) {
					spec.onUpdate(this.getDOMNode(), this.state);
				}
			},
			componentWillUnmount: function() {
				if (utils.isFunction(spec.onUnmount)) {
					spec.onUnmount(this.state);
				}
				this._hyprComponent.dispose();
			},
			shouldComponentUpdate: function(){
				return true;
			},
			render: function() {
				return createReactElement({
							type: utils.applyOrReturn(spec.type, this.state),
							props: utils.applyOrReturn(spec.props, this.state),
							children: utils.applyOrReturn(spec.children, this.state)
						},
						this._hyprComponent.domEventStream
					);
				}
			}
		);
	}

	var getOrCreateCreactClass = utils.singleArgMemoize(createReactClass,  { length: 1 });

	return function render(spec, props, mountNode) {
		return react.render(createReactElement({type: spec, props: props}), mountNode);
	}
};

function camelizeOnAttr(onattr){
	return ['on', onattr[2].toUpperCase(), onattr.substr(3)].join('');
}

function injectEventHandlers(props, domEventStream) {
	return utils.mapObject(function(key, value) {
		return key.indexOf('on') == 0 ?
			[
				camelizeOnAttr(key),
				function eventHandler(event) {
					event.stopPropagation();
					domEventStream.push(utils.mixin(event, typeof value === 'string' ? {name: value} : value))
				}
			] :
			[key, value]
		},
		props
	);
}

function translateAttributes(props) {
	var translation ={
		'for': 'htmlFor',
		'class': 'className'
	};

	return utils.mapObject(function(key, value) {
			return [translation[key] || key, value]
		},
		props
	);
}
