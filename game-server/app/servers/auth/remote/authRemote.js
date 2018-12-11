var userDao = require('../../../dao/userDao');
var Code = require('../../../../../shared/code');
var utils = require('../../../util/utils');
var async = require('async');

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
			if (res.length === 0) { 							//没有该玩家，创建玩家
				userDao.createNewUser(udid, callBack);
			} else {
				utils.invokeCallback(callBack, null, res);
			}
		}
	], function (err, res) {
		if (!err) {
			//将该玩家添加到大厅channel中
			var channel = self.channelService.getChannel("Hall", true);
			channel.add(res.mid, sid);

			//将用户信息写入redis
		}

		utils.invokeCallback(cb, err, res);
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
pro.userOffLine = function (mid, sid, cb) {
	var channel = this.channelService.getChannel("Hall", true);
	channel.leave(mid, sid);

	//修改redis中该用户的在线状态

	utils.invokeCallback(cb);
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