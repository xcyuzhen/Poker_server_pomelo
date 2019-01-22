var userDao = require('../../../dao/userDao');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var async = require('async');
var redisUtil = require("../../../util/redisUtil");

module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.robotMgrService = app.get('robotMgrService');
};

var pro = Remote.prototype;

/**
 * 用户登录
 *
 * @param  {Object}   	param 参数对象
 * @param  {Function} 	cb 回调函数
 * @return {Void}
 */
pro.reqOneRobot = function(param, cb) {
	var self = this;

	self.robotMgrService.reqOneRobot(param, function (err, resp) {
		utils.invokeCallback(cb, err, resp);
	});
};

/**
 * 用户离线
 *
 * @param  {Number}   	mid userID
 * @param  {String} 	sid serverId
 * @param  {Function} 	cb callBack
 * @return {Void}
 */
pro.userOffline = function (mid, sid, cb) {
	var self = this;

	var channel = this.channelService.getChannel("Hall", true);
	channel.leave(mid, sid);

	redisUtil.getUserDataByField(mid, ["gameServerType", "gameServerID"], function (err, resp) {
		if (!err) {
			utils.printObj(resp);

			if (resp[1] != undefined && resp[1] != "") {
				//玩家在游戏中，远程调用到房间逻辑
				self.app.rpc[resp[0]].roomRemote.userOffline.toServer(resp[1], mid, null);
			} else {
				//玩家不在游戏中，删除redis中该玩家信息
				redisUtil.logout(mid);
			}
		}
		utils.invokeCallback(cb, err);
	})
};

/**
 * 消息广播
 *
 * @param  {Number}   	mid userID
 * @param  {String} 	sid serverId
 * @param  {Function} 	cb callBack
 * @return {Void}
 */
pro.broadCast = function (msg, cb) {
	//对游戏所有玩家进行消息推送

	utils.invokeCallback(cb);
};