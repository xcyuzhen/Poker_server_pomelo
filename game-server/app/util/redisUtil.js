var redis = require('redis');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(__filename);
var utils = require('./utils');
var redisUtil = module.exports;

var USER_DATA_FIELDS = ['mid', 'nick', 'sex', 'gold', "diamond", "head_url"];
var USER_STATUS_FIELDS = ['online'];

var getKeyByMid = function (mid) {
	return mid + "_userInfo";
};

redisUtil.create = function () {
	var client = pomelo.app.get('redisClient');
	if (!!client) {
		return client;
	}

	var redisConfig = pomelo.app.get('redisConfig');
    client = redis.createClient(redisConfig.port, redisConfig.host, {});

    client.on("error", function (err) {
        logger.error("Redis:Error:" + err);
    });

    return client;
};

redisUtil.setUserData = function (userData, cb) {
	var key = getKeyByMid(userData.mid)
	var saveData = {};
	USER_DATA_FIELDS.forEach(function(field) {
		saveData[field] = userData[field];
	});

	pomelo.app.get('redisClient').hmset(key, saveData, function(err) {
		if (err) {
			logger.error("redisUtil.setUserData Error:" + err);
		}
		utils.invokeCallback(cb, err);
	})
};

redisUtil.getUserData = function (mid, cb) {
	var key = getKeyByMid(mid)
	var getData = {}

	pomelo.app.get('redisClient').hgetall(key, function(err, obj) {
		if (err) {
			logger.error("redisUtil.getUserData Error:" + err);
			utils.invokeCallback(cb, err);
		} else {
			USER_DATA_FIELDS.forEach(function(field) {
				getData[field] = obj[field];
			});

			utils.invokeCallback(cb, null, getData);
		}
	})
};

redisUtil.setUserStatus = function (statusData, cb) {

}

redisUtil.getUserStatus = function () {

}