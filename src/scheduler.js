var raf = require('raf');

module.exports = function() {
	var renderScheduled = false,
		rendering = false,
		renderFn = null;

	function render(fn){
		renderFn = fn;
		if(!renderScheduled) {
			renderScheduled = true;
			raf(function() {
				renderScheduled = false;
				if ( !rendering ) {
					rendering = true;
					renderFn();
					rendering = false;
				}
			});
		}
	}

	return render;
};