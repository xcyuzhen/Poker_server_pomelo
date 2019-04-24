var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../util/utils');
var redisUtil = require("../util/redisUtil");
var roomNumDao = require('../dao/roomNumDao');

/**
 * 房间号管理服务.
 *
 * RoomNumMgrService is created by roomNumMgr component
 * component of pomelo and roomNumMgr service would be accessed by `app.get('RoomNumMgrService')`.
 *
 * @class
 * @constructor
 */
var RoomNumMgrService = function(app, opts) {
	opts = opts || {};
    this.app = app;
    this.roomNumList = [];
    this.inuseRoomNum = {};
    this.reqMsgList = [];
    this.returnMsgList = [];

    this.reqHandling = false;
    this.returnHandling = false;
};

module.exports = RoomNumMgrService;

var pro = RoomNumMgrService.prototype;

pro.start = function(cb) {
	process.nextTick(cb);
};

pro.afterStart = function (cb) {
	var self = this;

	logger.info("初始化开房场房间号");

	//房间号初始化
	self.initRoomNumFromDB();

	process.nextTick(cb);	
};

pro.stop = function (cb) {
	var self = this;

	//清除redis中的机器人
	for (var i = self.roomNumList.length - 1; i >= 0; i--) {
		var robot = self.roomNumList[i];
		redisUtil.deleteUserData(robot.mid, function(err) {
			if (err) {
				logger.error("清除redis中机器人信息失败, err = " + err);
			}
		});
	}
	self.roomNumList = [];

	process.nextTick(cb);	
};

pro.initRoomNumFromDB = function (cb) {
	var self = this;

	var curNum = self.roomNumList.length;
	roomNumDao.initRoomNum(function (err, res) {
		if (!err) {
			if (res.length === 0) {
				if (curNum === 0) {
					logger.info("数据库中没有房间号，初始化房间号");

					//数据库中没有机器人，生成
					roomNumDao.createRoomNum(function (err) {
						if (!err) {
							logger.info("数据库创建房间号成功");
							self.initRoomNumFromDB(function (err) {
								utils.invokeCallback(cb, err);
							});
						}
					});
				} else {
					logger.info("没有更多机器人了");
					utils.invokeCallback(cb, err, res);
				}
			} else {
				logger.info("读取到房间号数据");

				//保存房间号
				for (var i = 0; i < res.length; i++) {
					self.roomNumList.push(res[i]);
				}

				utils.invokeCallback(cb, null, res);
			}
		} else {
			logger.error("从数据库读取房间号失败, err = " + err);

			utils.invokeCallback(cb, err);
		}
	});
};

//请求一个房间号
pro.reqOneRoomNum = function (cb) {
	var self = this;

	if (self.reqHandling) {
		self.reqMsgList.push(cb);
	} else {
		self.reqHandling = true;
		
		if (self.roomNumList.length <= 0) {
			var err = new Error("房间号全部被用完");
			utils.invokeCallback(cb, err);
		} else {
			var random = utils.randomNum(0, self.roomNumList.length);
			var roomNum = self.roomNumList.splice(random, 1)[0];
			self.inuseRoomNum[roomNum] = true;
			utils.invokeCallback(cb, null, roomNum);
		}

		self.reqHandling = false;

		//检查请求列表
		if (self.reqMsgList.length > 0) {
			var req = self.reqMsgList.splice(0, 1)[0];
			self.reqOneRoomNum(req);
		}
	}
};

//归还一个房间号
pro.returnOneRoomNum = function (roomNum, cb) {
	var self = this;

	if (self.returnHandling) {
		self.returnMsgList.push({roomNum: roomNum, cb: cb});
	} else {
		self.returnHandling = true;
		
		if (self.inuseRoomNum[roomNum]) {
			self.roomNumList.push(roomNum);
			delete(self.inuseRoomNum[roomNum]);
		}
		utils.invokeCallback(cb, null);

		self.returnHandling = false;

		//检查请返回请求列表
		if (self.returnMsgList.length > 0) {
			var req = self.returnMsgList.splice(0, 1)[0];
			self.returnOneRoomNum(req.roomNum, req.cb);
		}
	}
}