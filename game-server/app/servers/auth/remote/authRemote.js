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
	this.channelService = app.get('channelService');
};

var pro = Remote.prototype;

/**
 * 用户登录
 *
 * @param  {String}   	udid udid string
 * @param  {String} 	sid serverId
 * @return {Void}
 */
pro.login = function(udid, sid, cb) {
	var self = this;

	async.waterfall([
		function (callBack) {
			userDao.getUserByUdid(udid, callBack);
		},
		function (res, callBack) {
			if (res.length == 0) {
				userDao.createNewUser(udid, callBack);
			} else {
				utils.invokeCallback(callBack, null, res[0]);
			}
		}
	], function (err, res) {
		if (!err) {
			//将该玩家添加到大厅channel中
			var channel = self.channelService.getChannel("Hall", true);
			channel.add(res.mid, sid);

			//将用户信息写入redis
			res.sid = sid;
			redisUtil.setUserData(res, true, function (rErr) {
				if (rErr) {
					utils.invokeCallback(cb, rErr);
				} else {
					redisUtil.getCommonUserData(res.mid, function (rErr, data) {
						if (!rErr) {
							utils.invokeCallback(cb, err, data);
						}
					});
				}
			});
		}
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

	redisUtil.getUserDataByField(mid, ["gameServerType", "gameServerID", "roomNum"], function (err, resp) {
		if (!err) {
			utils.printObj(resp);

			if (resp[1] != undefined && resp[1] != "") {
				//玩家在游戏中，远程调用到房间逻辑
				self.app.rpc[resp[0]].roomRemote.userOffline.toServer(resp[1], mid, resp[2], null);
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