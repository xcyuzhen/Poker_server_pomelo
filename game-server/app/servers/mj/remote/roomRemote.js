var socketCmd = require('../../../models/socketCmd');

module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.roomMgrService = app.get('roomMgrService');
};

var pro = Remote.prototype;

//检测服务器是否满员
pro.getServerFullStatus = function (msg, cb) {
	this.roomMgrService.getServerFullStatus(msg, cb);
};

pro.socketMsg = function (mid, msg, cb) {
	this.roomMgrService.socketMsg(mid, msg, cb);
};

//玩家离线
pro.userOffline = function (mid, cb) {
	this.roomMgrService.userOffline(mid, cb);
};