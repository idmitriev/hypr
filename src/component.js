var utils = require('./utils'),
	stream = require('baconjs'),
	deepEqual = require('deep-equal');

module.exports = function component(spec, initialProps, id){
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

	stateStream.plug(
		utils.isFunction(stateSpec.onValue) ?
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
			utils.map(function(stream){
				stream.end();
			},[
				domEventStream,
				childrenStream,
				propStream,
				stateStream
			]);
			return this;
		}
	}
};