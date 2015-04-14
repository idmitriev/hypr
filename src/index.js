module.exports = require('./hypr');
module.exports.stream = require('baconjs');
module.exports.html = require('./html');
module.exports.element = require('./element');
module.exports.component = function component(spec){
	return function(props, children){
		return module.exports.element(spec, props, children);
	}
}