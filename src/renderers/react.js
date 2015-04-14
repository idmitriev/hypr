var stream = require('baconjs'),
	utils = require('../utils'),
	hyprComponent = require('../component');

module.exports = function(react) {
	function createReactElement(spec, parentReactComponent){
		return spec == null || typeof spec === 'string' || typeof spec === 'number' ?
			spec :
			utils.isArray(spec) ?
				spec.map(function(spec){
					return createReactElement(spec, parentReactComponent)
				}) :
				utils.isFunction(spec.type) ?
					createReactElement(spec.type(spec.props || {}, spec.children), parentReactComponent) :
					react.createElement(
						typeof spec.type === 'string' ?
							spec.type :
							getOrCreateReactClass(spec.type),
						typeof spec.type === 'string' ?
							translateAttributes(
								utils.mixin(
									{ ref: spec.id, key: spec.id },
									parentReactComponent._hyprComponent.domEventStream != null ?
										injectEventHandlers(spec.props == null ?
											{} :
											utils.applyOrReturn(spec.props, parentReactComponent.state),
										parentReactComponent._hyprComponent.domEventStream) :
										spec.props == null ?
											{} :
											utils.applyOrReturn(spec.props, parentReactComponent.state)
								)
							) :
							utils.mixin(spec.props || {}, { ref: spec.id, key: spec.id }),
						createReactElement(spec.children, parentReactComponent)
					);
	}

	function createReactClass(spec){
		return react.createClass({
			displayName: spec.name,
			getDefaultProps: function() {
				return spec.defaults || {};
			},
			componentWillMount: function() {
				var self = this;

				this._hyprComponent = hyprComponent(spec, this.props, this.props.id);

				this._hyprComponent.state.onValue(function(state){
					return self.setState(state);
				});
			},
			componentDidMount: function() {
				this._hyprComponent.pushChildren(getChildren(this.refs));
				if (utils.isFunction(spec.onMount)) {
					spec.onMount(this.getDOMNode(), this.state, this._hyprComponent.domEventStream);
				}
			},
			componentWillReceiveProps: function(nextProps) {
				this._hyprComponent.pushProps(nextProps);
			},
			componentDidUpdate: function() {
				this._hyprComponent.pushChildren(getChildren(this.refs));
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
							id: this._hyprComponent.id,
							type: utils.applyOrReturn(spec.type, this.state),
							props: utils.applyOrReturn(spec.props, this.state),
							children: utils.applyOrReturn(spec.children, this.state)
						},
						this
					);
				}
			}
		);
	}

	var getOrCreateReactClass = utils.singleArgMemoize(createReactClass);

	return function render(element, mountNode, callback) {
		return react.render(
			createReactElement(element),
			mountNode,
			callback
		)._hyprComponent;
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

function getChildren(refs){
	return utils.mapObject(
		function(key, value){
			return [key, utils.pick(['events', 'state'], value._hyprComponent)]
		},
		utils.pick(
			utils.keys(refs).filter(function(key){
				return refs[key]._hyprComponent != null;
			}),
			refs
		)
	);
}

