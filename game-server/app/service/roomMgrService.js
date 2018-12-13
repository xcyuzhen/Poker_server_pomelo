var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var Consts = require('../consts/consts');

/**
 * 房间管理服务.
 *
 * RoomMgrService is created by roomMgr component
 * component of pomelo and roomMgr service would be accessed by `app.get('roomMgrService')`.
 *
 * @class
 * @constructor
 */
var RoomMgrService = function(app, opts) {
	opts = opts || {};
    this.app = app;
};

module.exports = RoomMgrService;

var pro = RoomMgrService.prototype;

pro.start = function(cb) {
	process.nextTick(cb);
};

//初始化房间
pro.initRooms = function (RoomObj) {
	
}