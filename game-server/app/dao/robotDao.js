var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var User = require('../domain/user');
var consts = require('../consts/consts');
var utils = require('../util/utils');

var RobotDao = module.exports;
var userInfoMap = {};

/**
 * 生成机器人
 *
 * @param  {Function} 	cb 				回调
 * @return {Void}
 */
RobotDao.createRobots = function (cb) {
	var robotConfig = require("../../config/robots.json");
	var valStr = robotConfig.join(",");
	var sql = "INSERT INTO robot_info (id, mid, nick, sex, gold, head_url) values " + valStr;
	pomelo.app.get('dbclient').query(sql, {}, function (err, res) {
		if (err !== null) {
			logger.error('create robots err!');
			logger.error(err.message);
			utils.invokeCallback(cb, err, null);
		} else {
			utils.invokeCallback(cb, err, res);
		}
	});
};

/**
 * 获取机器人
 *
 * @param  {Number}   	num 			获取机器人的个数
 * @param  {Number}   	startIndex 		起始索引
 * @param  {Function} 	cb 				回调
 * @return {Void}
 */
RobotDao.getRobots = function (num, startIndex, cb) {
	var endIndex = num + startIndex - 1;
	var sql = "SELECT * FROM robot_info WHERE id >= ? and id <= ?;";
	var param = [startIndex, endIndex];
	pomelo.app.get('dbclient').query(sql, param, function (err, res) {
		if (err !== null) {
			logger.error('get robots failed!');
			logger.error(err.message);
			utils.invokeCallback(cb, err, null);
		} else {
			utils.invokeCallback(cb, err, res);
		}
	});
};

/**
 * 更新机器人信息
 *
 * @param  {Array}   	robotList 		机器人列表
 * @param  {Function} 	cb 				回调
 * @return {Void}
 */
RobotDao.updateRobotsInfo = function (robotList, cb){
	// var sql = 'select * from User where id = ?';
	// var args = [uid];
	// pomelo.app.get('dbclient').query(sql,args,function(err, res){
	// 	if(err !== null){
	// 		utils.invokeCallback(cb, err.message, null);
	// 		return;
	// 	}

	// 	if (!!res && res.length > 0) {
	// 		utils.invokeCallback(cb, null, new User(res[0]));
	// 	} else {
	// 		utils.invokeCallback(cb, ' user not exist ', null);
	// 	}
	// });
};
