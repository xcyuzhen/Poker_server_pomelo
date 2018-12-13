module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.roomMgrService = app.get('roomMgrService');
};

var pro = Remote.prototype;

//加入场次
pro.enterGroupLevel = function (mid, groupLev, cb) {

};