module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

var pro = Remote.prototype;

//加入场次
pro.enterGroupLevel = function (mid, groupLev, cb) {

};