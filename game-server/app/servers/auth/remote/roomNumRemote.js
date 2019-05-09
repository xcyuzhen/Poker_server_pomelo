module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.roomNumMgrService = app.get('roomNumMgrService');
};

var pro = Remote.prototype;

/**
 * 请求一个房间号
 *
 * @param  {Function} 	cb 			回调函数
 * @return {Void}
 */
pro.reqOneRoomNum = function(cb) {
	this.roomNumMgrService.reqOneRoomNum(cb);
};

/**
 * 归还房间号
 *
 * @param  {Number}   	roomNum 	房间号
 * @param  {Function} 	cb 			回调函数
 * @return {Void}
 */
pro.returnOneRoomNum = function(roomNum, cb) {
	this.roomNumMgrService.returnOneRoomNum(roomNum, cb);
};