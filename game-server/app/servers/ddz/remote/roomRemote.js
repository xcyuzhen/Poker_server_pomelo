module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

var pro = Remote.prototype;

