var raf = require('raf');

module.exports = function rafScheduler() {
	var scheduled = false,
		running = false,
		task = null;

	return function schedule(t){
		task = t;
		if(!scheduled) {
			scheduled = true;
			raf(function() {
				scheduled = false;
				if ( !running ) {
					running = true;
					task();
					running = false;
				}
			});
		}
	}
};