var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../util/utils');
var redisUtil = require("../util/redisUtil");
var robotDao = require('../dao/robotDao');

/**
 * 机器人管理服务.
 *
 * RobotMgrService is created by robotMgr component
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

    this.reqHandling = false;
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
	self.getMoreRobotsFromDB();

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

pro.getMoreRobotsFromDB = function (cb) {
	var self = this;

	var curNum = self.robotsList.length;
	robotDao.getRobots(5, (curNum + 1), function (err, res) {
		if (!err) {
			if (res.length == 0) {
				if (curNum == 0) {
					logger.info("数据库中没有机器人，根据配置将机器人写入数据库");

					//数据库中没有机器人，生成
					robotDao.createRobots(function (err) {
						if (!err) {
							logger.info("数据库创建机器人成功");
							self.getMoreRobotsFromDB(function (err) {
								utils.invokeCallback(cb, err);
							});
						}
					});
				} else {
					logger.info("没有更多机器人了");
					utils.invokeCallback(cb, err, res);
				}
			} else {
				logger.info("读取到机器人数据，写入redis并且记录信息");

				//数据库中有机器人，保存在redis中
				var writeCount = 0;
				for (var i = 0; i < res.length; i++) {
					var robotData = res[i];
					redisUtil.setUserData(robotData, true, function (tErr) {
						if (!tErr) {
							writeCount++;
							if (writeCount >= res.length) {
								utils.invokeCallback(cb, null, res);
							}
						}
					})

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
		} else {
			logger.error("从数据库读取更多机器人失败 startIndex = " + (curNum + 1) + ", err = " + err);

			utils.invokeCallback(cb, err);
		}
	});
};

//请求一个机器人
pro.reqOneRobot = function (param, cb) {
	var self = this;

	if (self.reqHandling) {
		self.reqMsgList.push({param: param, cb: cb});
	} else {
		self.reqHandling = true;

		var minGold = param.minGold || 0;
		var maxGold = param.maxGold || 99999999;

		var resultMid;
		for (var i = self.robotsList.length - 1; i >= 0; i--) {
			var robotItem = self.robotsList[i];
			var gold = robotItem.gold;
			if (robotItem.inUse == 0 && gold >= minGold && gold <= maxGold) {
				robotItem.inUse = 1;
				resultMid = robotItem.mid;
				break;
			}
		}

		var endCallBack = function () {
			self.reqHandling = false;
			if (self.reqMsgList.length > 0) {
				var req = self.reqMsgList.splice(0, 1)[0];
				self.reqOneRobot(req.param, req.cb);
			}
		};

		if (resultMid) {
			//找到了可用的机器人
			logger.info("找到了可用的机器人");

			utils.invokeCallback(cb, null, resultMid);
			endCallBack();
		} else {
			//没有了可用的机器人
			logger.info("当前没有适合条件的机器人，去数据库加载更多");
			self.getMoreRobotsFromDB(function (err, resp) {
				if (!err) {
					if (resp.length == 0) {
						logger.info("全部搜索完毕，没有更多机器人");
						utils.invokeCallback(cb, null, null);
						endCallBack();
					} else {
						self.reqHandling = false;
						self.reqOneRobot(param, cb)
					}
				}
			});
		}
	}
};

//归还一个机器人
pro.returnOneRobot = function (mid, cb) {
	var self = this;
	var robot;

	for (var i = self.robotsList.length - 1; i >= 0; i--) {
		var robotItem = self.robotsList[i];
		if (robotItem.mid == mid) {
			robot = robotItem;
			break;
		}
	}

	if (robot) {
		//还原标记位
		robot.inUse = 0;

		//设置金币数
		redisUtil.getUserDataByField(mid, ["gold"], function (err, resp) {
			if (!err) {
				robot.gold = parseInt(resp[0]);
			}

			utils.invokeCallback(cb, err);
		});
	} else {
		logger.error('没有找到该机器人, mid = ' + mid);
		utils.invokeCallback(cb, null);
	}
}