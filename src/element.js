var utils = require('./utils');

function parseTag(tag){
	var
		idRx = /#[a-zA-Z0-9_:-]+/,
		classRx = /\.([a-zA-Z0-9_:-]+)/g,
		id = tag.match(idRx) != null ?
			tag.match(idRx)[0] :
			undefined,
		className = tag.match(classRx) != null ?
			tag.match(classRx).join(' ').replace('.', '') :
			undefined,
		tagName = tag.split(/[#|\.]/)[0];

	return {
		id: id,
		className: className,
		tagName: tagName
	};
}

module.exports = function element(tag, props, children){
	var
		parsed = typeof tag === 'string' ?
			parseTag(tag) :
			{};
	return {
		id: props.id != null ?
			props.id :
			parsed.id != null ?
				parsed.id :
				undefined,
		type: parsed.tagName != null ?
			parsed.tagName :
			tag,
		props: utils.mixin(
			props,
			parsed.className != null ?
				{ class: parsed.className } :
				{}
		),
		children: children == null && typeof props !== 'object' ?
			props :
			children
	}
};