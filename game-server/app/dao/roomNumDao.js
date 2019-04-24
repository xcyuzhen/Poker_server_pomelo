var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var User = require('../domain/user');
var consts = require('../consts/consts');
var utils = require('../util/utils');

var RobotDao = module.exports;
var userInfoMap = {};

/**
 * 生成房间号
 *
 * @param  {Function} 	cb 				回调
 * @return {Void}
 */
RobotDao.createRoomNum = function (cb) {
	var roomNumArr = [];
	var roomNumMap = {};
	for (var i = 0; i < 10000; i++) {
		var random;
		do {
			random = utils.randomNum(100000, 999999);
		} while (roomNumMap[random]);
		roomNumMap[random] = true;
		roomNumArr.push(("(" + random + ")"));
	}

	var valStr = roomNumArr.join(",");
	var sql = "INSERT INTO room_num (roomNum) values " + valStr;
	pomelo.app.get('dbclient').query(sql, {}, function (err, res) {
		if (err !== null) {
			logger.error('create room num err!');
			logger.error(err.message);
			utils.invokeCallback(cb, err, null);
		} else {
			utils.invokeCallback(cb, err, res);
		}
	});
};

/**
 * 从数据库中读取房间号
 *
 * @param  {Function} 	cb 				回调
 * @return {Void}
 */
RobotDao.initRoomNum = function (cb) {
	var sql = "SELECT roomNum FROM room_num;";
	pomelo.app.get('dbclient').query(sql, {}, function (err, res) {
		if (err !== null) {
			logger.error('get room num failed!');
			logger.error(err.message);
			utils.invokeCallback(cb, err, null);
		} else {
			utils.invokeCallback(cb, err, res);
		}
	});
};