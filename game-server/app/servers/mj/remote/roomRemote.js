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

//检测服务器是否存在传入房间号的房间
pro.exitRoomByRoomNum = function (roomNum, cb) {
	this.roomMgrService.exitRoomByRoomNum(roomNum, cb);
};

pro.socketMsg = function (mid, roomNum, msg, cb) {
	this.roomMgrService.socketMsg(mid, roomNum, msg, cb);
};

//玩家上线
pro.userOnline = function (mid, roomNum, cb) {
	this.roomMgrService.userOnline(mid, roomNum, cb);
};

//玩家离线
pro.userOffline = function (mid, roomNum, cb) {
	this.roomMgrService.userOffline(mid, roomNum, cb);
};