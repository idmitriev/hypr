var
	utils = require('./utils'),
	reactRenderer = require('./renderers/react'),
	mithrilRenderer = require('./renderers/mithril'),
	virtualDomRenderer = require('./renderers/virtual-dom');

module.exports = function hypr(rendererLib){
	return function render(element, mountNode, callback) {
		(rendererLib.createClass != null && rendererLib.createElement != null && rendererLib.render != null ?
			reactRenderer :
			utils.isFunction(rendererLib) && rendererLib.module != null ?
				mithrilRenderer :
				rendererLib.h != null && rendererLib.diff != null && rendererLib.patch != null && rendererLib.create != null ?
					virtualDomRenderer :
					function() {
						throw new Error('Rendering library not supported');
					}
		)(rendererLib)(utils.applyOrReturn(element, {}), mountNode, callback);
	}
}