var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../util/utils');
var redisUtil = require("../util/redisUtil");
var Consts = require('../consts/consts');
var SocketCmd = require('../models/socketCmd');
var async = require('async');
var Code = require('../../../shared/code');
var robotDao = require('../dao/robotDao');

/**
 * 机器人管理服务.
 *
 * RobotMgrService is created by roomMgr component
 * component of pomelo and robotMgr service would be accessed by `app.get('RobotMgrService')`.
 *
 * @class
 * @constructor
 */
var RobotMgrService = function(app, opts) {
	opts = opts || {};
    this.app = app;
    this.robotsList = [];
    this.reqMsgList = [];
};

module.exports = RobotMgrService;

var pro = RobotMgrService.prototype;

pro.start = function(cb) {
	process.nextTick(cb);
};

pro.afterStart = function (cb) {
	var self = this;

	logger.info("初始化机器人");

	//机器人初始化回调
	var initRobotsCB;
	initRobotsCB = function () {
		
	}
	initRobotsCB();

	process.nextTick(cb);	
};

pro.stop = function (cb) {
	var self = this;

	//清除redis中的机器人
	for (var i = self.robotsList.length - 1; i >= 0; i--) {
		var robot = self.robotsList[i];
		redisUtil.deleteUserData(robot.mid, function(err) {
			if (err) {
				logger.error("清除redis中机器人信息失败, err = " + err);
			}
		});
	}
	self.robotsList = [];

	process.nextTick(cb);	
};

pro.getMoreRobotsFromDB = function () {
	var self = this;

	var curNum = self.robotsList.length;
	robotDao.getRobots(5, (curNum + 1), function (err, res) {
		if (!err) {
			if (res.length === 0) {
				logger.info("数据库中没有机器人，创建机器人");

				//数据库中没有机器人，生成
				robotDao.createRobots(function (err) {
					if (!err) {
						logger.info("数据库创建机器人成功");
						initRobotsCB();
					}
				});
			} else {
				logger.info("读取到机器人数据，写入redis并且记录信息");

				//数据库中有机器人，保存在redis中
				for (var i = 0; i < res.length; i++) {
					var robotData = res[i];
					redisUtil.setUserData(robotData, true)

					var robotItem = {
						id: robotData.id,
						mid: robotData.mid,
						gold: robotData.gold,
						diamond: robotDao.diamond,
						inUse: 0,
					};
					self.robotsList.push(robotItem);
				}
			}
		}
	});
};

//请求一个机器人
pro.reqOneRobot = function (param cb) {
	var self = this;

	var minGold = param.minGold || 0;
	var maxGold = param.maxGold || 99999999;

	var resultMid;
	for (var i = self.robotsList.length - 1; i >= 0; i--) {
		var robotItem = self.robotsList[i];
		var gold = robotItem.gold;
		if (robotItem.inUse === 0 && gold >= minGold && gold <= maxGold) {
			resultMid = robotItem.mid;
			break;
		}
	}

	if (resultMid) {
		//找到了可用的机器人
	} else {
		//没有了可用的机器人
	}
};