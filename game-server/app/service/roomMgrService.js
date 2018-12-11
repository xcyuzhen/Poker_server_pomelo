var logger = require('pomelo-logger').getLogger('pomelo', __filename);

/**
 * constant
 */
var ST_INITED = 0;
var ST_DESTROYED = 1;

/**
 * 房间管理服务.
 *
 * RoomMgrService is created by roomMgr component
 * component of pomelo and channel service would be accessed by `app.get('roomMgrService')`.
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

pro.afterStart = function (cb) {
	process.nextTick(cb);
}