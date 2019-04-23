var redis = require('redis');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(__filename);
var utils = require('./utils');
var async = require('async');

var redisUtil = module.exports;

var USER_DATA_FIELD_ALL = ["mid", "nick", "sex", "gold", "diamond", "head_url", "gameServerType", "gameServerID", "roomNum", "state", "sid"];
var USER_DATA_FIELD_COMMON = ["mid", "nick", "sex", "gold", "diamond", "head_url"];

var getKeyByMid = function (mid) {
	if (utils.midCheck(mid)) {
		return mid + "_userInfo";
	} else {
		logger.error("mid illegal" + mid);
		return null;
	}
};

var getDefaultUserData = function () {
	var data = {
		mid: 0, 									//mid
		nick: "", 									//昵称
		sex: 0, 									//性别
		gold: 0, 									//金币数量
		diamond: 0, 								//钻石数量
		head_url: "", 								//头像
		gameServerType: "",							//当前所在游戏服务器类型
		gameServerID: "", 							//当前所在游戏服务器ID ""-没有在游戏中 "mj-server-1"-服务器ID
		roomNum: "", 								//当前所在游戏房间号
		state: 0,   								//当前状态 0-大厅 1-匹配中 2-在房间
	};

	return data
};

/**
 * 创建redis客户端
 *
 */
redisUtil.create = function () {
	var client = pomelo.app.get('redisClient');
	if (!!client) {
		return client;
	}

	var redisConfig = pomelo.app.get('redisConfig');
    client = redis.createClient(redisConfig.port, redisConfig.host, {});

    client.on("connect", function () {
        logger.info("redis connected");
    });

    client.on("error", function (err) {
        logger.error("Redis:Error:" + err);
    });

    return client;
};

/**
 * 判断玩家信息是否存在
 *
 * @param  {Number}   	mid 	玩家id
 * @param  {Function} 	cb 		回调
 * @return {Void}
 */
redisUtil.exitUserData = function (mid, cb) {
	var key = getKeyByMid(mid)
	pomelo.app.get('redisClient').hlen(key, function(err, resp) {
		if (err) {
			logger.error("redisUtil.exitUserData Error:" + err);
		}

		utils.invokeCallback(cb, err, (resp > 0));
	});
}

/**
 * 设置玩家信息
 *
 * @param  {Object}   	userData 	玩家信息
 * @param  {Function} 	cb 			回调
 * @param  {Boolean} 	autoCreate 	是否自动创建回调
 * @return {Void}
 */
redisUtil.setUserData = function (userData, autoCreate, cb) {
	redisUtil.exitUserData(userData.mid, function (err, resp) {
		if (err) {
			utils.invokeCallback(cb, err, null);
		} else {
			var key = getKeyByMid(userData.mid)

			if (resp) {
				//redis中已经有了该玩家信息
				var setData = {}
				USER_DATA_FIELD_ALL.forEach(function(field) {
				    if (userData[field] != undefined) {
				    	setData[field] = userData[field];
				    }
				});
				pomelo.app.get('redisClient').hmset(key, setData, function(err) {
					if (err) {
						logger.error("redisUtil.setUserData Error:" + err);
					}
					utils.invokeCallback(cb, err);
				});
			} else {
				//redis中没有该玩家信息
				if (!autoCreate) {
					//没有找到玩家信息
					logger.error("redisUtil.setUserData Error:没有找到玩家信息");
					utils.invokeCallback(cb, {message: "没有找到玩家信息"});
				} else {
					var initData = getDefaultUserData();
					USER_DATA_FIELD_ALL.forEach(function(field) {
					    if (userData[field] != undefined) {
					    	initData[field] = userData[field];
					    }
					});

					pomelo.app.get('redisClient').hmset(key, initData, function(err) {
						if (err) {
							logger.error("redisUtil.setUserData Error:" + err);
						}
						utils.invokeCallback(cb, err);
					});
				}
			}
		}
	});
};

/**
 * 获取所有玩家信息
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.getAllUserData = function (mid, cb) {
	var key = getKeyByMid(mid)

	pomelo.app.get('redisClient').hgetall(key, function(err, obj) {
		if (err) {
			logger.error("redisUtil.getAllUserData Error:" + err);
			utils.invokeCallback(cb, err);
		} else {
			utils.invokeCallback(cb, null, obj);
		}
	})
};

/**
 * 获取通用玩家信息
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.getCommonUserData = function (mid, cb) {
	redisUtil.getAllUserData(mid, function (err, obj) {
		if (err) {
			utils.invokeCallback(cb, err);
		} else {
			var commonData = {}
			USER_DATA_FIELD_ALL.forEach(function(field) {
			    if (obj[field] != undefined) {
			    	commonData[field] = obj[field];
			    }
			});

			utils.invokeCallback(cb, null, commonData);
		}
	});
};

/**
 * 删除玩家信息
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.deleteUserData = function (mid, cb) {
	var key = getKeyByMid(mid)

	pomelo.app.get('redisClient').hdel(key, USER_DATA_FIELD_ALL, function(err) {
		if (err) {
			logger.error("redisUtil.deleteUserData Error:" + err);
		}
		utils.invokeCallback(cb, err);
	})
};

/**
 * 玩家是否在游戏中
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.isUserInGame = function (mid, cb) {
	var key = getKeyByMid(mid)
	pomelo.app.get('redisClient').hget(key, "gameServerID", function(err, resp) {
		if (err) {
			logger.error("redisUtil.deleteUserData Error:" + err);
			utils.invokeCallback(cb, err);
		} else {
			if ((resp !== undefined) && (resp !== "")) {
				utils.invokeCallback(cb, err, true);
			} else {
				utils.invokeCallback(cb, err, false);
			}
		}
	})
};

/**
 * 获取字段对应的玩家数据
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {String}   	fields 		字段名字列表
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.getUserDataByField = function (mid, fields, cb) {
	var key = getKeyByMid(mid)
	pomelo.app.get('redisClient').hmget(key, fields, function(err, resp) {
		if (err) {
			logger.error("redisUtil.getUserDataByField Error:" + err);
			utils.invokeCallback(cb, err);
		} else {
			utils.invokeCallback(cb, err, resp);
		}
	})
};

////////////////////////////////////玩家行为begin////////////////////////////////////
/**
 * 玩家请求进入场次
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.requestEnterGroupLevel = function (mid, cb) {
	redisUtil.setUserData({mid: mid, state: 1}, false, cb);
};

/**
 * 玩家退出登录
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.logout = function (mid, cb) {
	redisUtil.deleteUserData(mid, cb);
};

/**
 * 玩家退出登录
 *
 * @param  {Number}   	mid 			玩家id
 * @param  {String}   	serverType 		服务器类型
 * @param  {String}   	serverID 		服务器ID
 * @param  {Number}   	roomNum 		房间号
 * @param  {Function} 	cb 				回调
 * @return {Void}
 */
redisUtil.enterRoom = function (mid, serverType, serverID, roomNum, cb) {
	redisUtil.setUserData({mid: mid, gameServerType: serverType, gameServerID: serverID, roomNum: roomNum, state: 2}, false, cb);
};

/**
 * 玩家返回大厅
 *
 * @param  {Number}   	mid 		玩家id
 * @param  {Function} 	cb 			回调
 * @return {Void}
 */
redisUtil.leaveRoom = function (mid, cb) {
	redisUtil.setUserData({mid: mid, gameServerType: "", gameServerID: "", roomNum: "", state: 0}, false, cb);
};
////////////////////////////////////玩家行为end////////////////////////////////////
