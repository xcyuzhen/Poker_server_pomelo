var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var Consts = require('../consts/consts');
var MjConsts = require('../consts/mjConsts');
var utils = require('../util/utils');
var redisUtil = require("../util/redisUtil");
var GameConfig = require('../models/gameConfig');
var Code = require('../../../shared/code');
var UserItem = require('../domain/mjUserItem');
var SocketCmd = require('../models/socketCmd');

var Room = function (app, opts) {
	this.app = app;
	this.channelService = app.get("channelService");
	this.roomMgrService = app.get("roomMgrService");
	opts = opts || {};
	this.roomIndex = opts.roomIndex || 0;
	this.roomState = Consts.ROOM.STATE.UN_INITED;	//当前房间状态
	this.userList = {}; 							//玩家列表
	this.roomData = {}; 							//房间信息
	this.gameData = {}; 							//游戏数据
	this.channel = null; 							//channel
	this.roomConfig = null; 						//房间配置

	this.timeoutID = null; 							//房间延时ID
	this.intervalID = null; 						//循环计时ID
};

var pro = Room.prototype;

//初始化房间
pro.initRoom = function (roomConfig) {
	this.roomConfig = roomConfig;

	//生成房间号
	var level = roomConfig.level
	var serverID = this.app.getServerId();
	var serverFlag = GameConfig.gameServerFlag[serverID]
	var roomNum = (level + serverFlag) * 100000 + this.roomIndex;

	//初始化房间数据
	this.roomData.level = level;
	this.roomData.roomNum = roomNum;
	this.roomData.maxPlayerNum = 4;
	this.roomData.curPlayerNum = 0;
	this.roomData.realPlayerNum = 0;

	//初始化牌局数据
	this.gameData.cardList = []; 					//牌列表
	this.gameData.curTurnSeatID = 0; 				//当前摸牌打牌操作座位号
	this.gameData.leftTime = 0; 					//当前操作倒计时
	this.gameData.seatMidMap = {}; 					//座位号和mid的映射表

	//初始化channel
	this.channel = this.channelService.getChannel(roomNum, true);

	//修改房间状态
	this.roomState = Consts.ROOM.STATE.INITED;
};

//玩家进入房间
pro.enterRoom = function (mid, isRobot) {
	console.log("玩家进入房间 mid = ", mid);
	var self = this;

	//清除timer
	self.clearTimeoutTimer();

	//修改redis中玩家的状态
	redisUtil.setUserData({mid: mid, gameServerType: self.app.getServerType(), gameServerID: self.app.getServerId(), state: 2}, false, function (err) {
		if (err) {
			logger.error("mjRoom.enterRoom error");
		} else {
			console.log("修改玩家state等数据");

			//获取玩家信息，添加到用户列表
			redisUtil.getAllUserData(mid, function (err, userDataAll) {
				if (err) {
					logger.error("mjRoom.enterRoom 获取用户数据失败，mid = ", mid);
				} else {
					console.log("获取玩家所有数据");
					var userItem = new UserItem(self, userDataAll);

					//初始化玩家的位置
					userItem.seatID = self.getAvailableSeatID();

					//设置机器人标记位
					if (isRobot) {
						userItem.robot = 1;
					}

					console.log("玩家座位号： ", userItem.seatID);

					//将玩家添加进玩家列表
					self.userList[mid] = userItem;

					//将座位号添加到座位mid映射表中
					self.gameData.seatMidMap[userItem.seatID] = mid;

					if (!isRobot) {
						//将玩家添加进channel
						self.channel.add(mid, userDataAll.sid);
					}

					//组装发给客户端的userList
					var clientUserList = {};
					//已经在房间的玩家
					var otherMidList = [];
					//当前玩家人数
					var curPlayerNum = 0;
					//真实玩家人数
					var realPlayerNum = 0;
					for (var tMid in self.userList) {
						var tUserItem = self.userList[tMid];
						clientUserList[tMid] = tUserItem.exportClientData();

						if (tMid !== mid && (tUserItem.robot === 0)) {
							otherMidList.push(tMid);
						}

						curPlayerNum++;

						if (tUserItem.robot === 0) {
							realPlayerNum++;
						}
					}

					//记录当前玩家人数
					self.roomData.curPlayerNum = curPlayerNum;

					//记录真实玩家人数
					self.roomData.realPlayerNum = realPlayerNum;

					//将房间全部信息发给刚进入的玩家
					var param = {
						groupName: MjConsts.MSG_GROUP_NAME,
						res: {
							socketCmd: SocketCmd.ENTER_ROOM,
							roomData: self.exportRoomData(),
							userList: clientUserList,
						},
					};
					var uidList = [self.channel.getMember(mid)]
					self.pushMessageByUids([mid], param);

					//通知其他玩家有新玩家加入
					if (otherMidList.length > 0) {
						var param = {
							groupName: MjConsts.MSG_GROUP_NAME,
							res: {
								socketCmd: SocketCmd.USER_ENTER,
								userData: userItem.exportClientData(),
							},
						};
						self.pushMessageByUids(otherMidList, param);
					}

					//判断房间是否已满
					var isFull = self.isRoomFull();
					if (isFull) {
						self.waitToStart();
					} else {
						self.startReqRobotTimer();
					}
				}
			});
		}
	});
};

//玩家请求离开房间
pro.leaveRoom = function (mid, cb) {
	var self = this;

	//清除timer
	self.clearTimeoutTimer();

	logger.info("玩家离开房间 mid = ", mid);
	var userItem = self.userList[mid];
	if (!userItem) {
		logger.info("该玩家不在房间内");
		return;
	}

	if (self.roomState === Consts.ROOM.STATE.PLAYING) {
		utils.invokeCallback(cb, null, {
			code: Code.ROOM.GAME_PLAYING,
			msg: "牌局进行中无法退出房间",
		});
		return;
	}

	redisUtil.getUserDataByField(mid, ["sid"], function(err, resp) {
		if (err) {
			logger.error("mjRoom.leaveRoom 获取玩家sid失败");
		} else {
			var isRobot = userItem.robot === 1;

			if (!isRobot) {
				//将该玩家从channel中踢出
				self.channel.leave(mid, resp[0]);
			}

			//清理
			userItem.clean();

			//删除座位mid映射数据
			delete(self.gameData.seatMidMap[userItem.seatID]);

			//删除该玩家数据
			delete(self.userList[mid]);
			redisUtil.leaveRoom(mid);

			//记录当前玩家人数
			self.roomData.curPlayerNum--;

			//记录真实玩家人数
			if (!isRobot) {
				self.roomData.realPlayerNum--;
			}

			//如果该房间所有玩家都已经离开，回收该房间
			console.log("房间剩余人数 playerNum = ", self.roomData.curPlayerNum);
			if (self.roomData.curPlayerNum === 0) {
				self.clearRoom();
				self.roomMgrService.recycleRoom(self.roomIndex);
			} else {
				var otherMidList = [];
				for (var tMid in self.userList) {
					otherMidList.push(tMid);
				}

				//通知其他人该玩家离开
				if (otherMidList.length > 0) {
					var param = {
						groupName: MjConsts.MSG_GROUP_NAME,
						res: {
							socketCmd: SocketCmd.USER_LEAVE,
							mid: mid,
						},
					};
					self.pushMessageByUids(otherMidList, param);
				}
			}

			utils.invokeCallback(cb, null, {
				code: Code.OK,
			});
		}
	});
};

pro.userReady = function (mid) {

};

//玩家掉线
pro.userOffline = function (mid) {
	var self = this;

	if (self.roomState === Consts.ROOM.STATE.PLAYING) {
		//玩家在游戏中，修改该玩家的在线状态
		var userItem = self.userList[mid];
		userItem.online = 0;

		//广播该玩家掉线的消息
	} else {
		self.leaveRoom(mid);
	}
};

//房间是否已经初始化
pro.isRoomInited = function () {
	return this.inited;
};

//房间场次
pro.getGroupLevel = function () {
	return this.roomData.level;
};

//房间号
pro.getRoomNumber = function () {
	return this.roomData.roomNum;
};

//房间是否已满
pro.isRoomFull = function () {
	return this.roomData.curPlayerNum === this.roomData.maxPlayerNum;
};

//玩家是否在房间中
pro.isUserInRoom = function (mid) {
	if (this.userList[mid]) {
		return true;
	}

	return false;
};

//获取真实玩家数量
pro.getRealUserNum = function () {
	return this.roomData.realPlayerNum;
};

//推送消息
pro.pushMessageByUids = function (midList, param) {
	var self = this;

	midList = midList || [];
	var realUserMemList = [];

	for (var i = midList.length - 1; i >= 0; i--) {
		var mid = midList[i];
		var userItem = self.userList[mid];

		if (userItem.robot === 0) {
			realUserMemList.push(self.channel.getMember(mid));
		} else {
			userItem.onSocketMsg(param);
		}
	}

	if (realUserMemList.length > 0) {
		logger.info("--------------------推送消息--------------------");
		logger.info("memberList = " + JSON.stringify(realUserMemList));
		logger.info("param = " + JSON.stringify(param));

		self.channelService.pushMessageByUids("onSocketMsg", param, realUserMemList, {}, function (err) {
			if (err) {
				logger.error("消息推送失败，err = " + err);
			}
		});
	}
};

/////////////////////////////////////牌局流程begin/////////////////////////////////////
//等待开局
pro.waitToStart = function () {
	logger.info("全部玩家到齐，开始进入准备流程");
};
/////////////////////////////////////牌局流程end/////////////////////////////////////

/////////////////////////////////////功能函数begin/////////////////////////////////////
//获取可用的座位号
pro.getAvailableSeatID = function () {
	var seatUse = [];

	//将已经被占用的座位添加列表
	for (var mid in this.userList) {
		var userItem = this.userList[mid];
		seatUse[userItem.seatID] = true;
	}

	for (var i = 1; i <= this.roomData.maxPlayerNum; i++) {
		if (!seatUse[i]) {
			return i;
		}
	}
}

//导出发送给客户端的roomData
pro.exportRoomData = function () {
	var data = {};

	data.level = this.roomData.level;
	data.roomNum = this.roomData.roomNum;
	data.maxPlayerNum = this.roomData.maxPlayerNum;

	return data;
}

//开始请求机器人定时器
pro.startReqRobotTimer = function () {
	var self = this;

	self.clearTimeoutTimer();
	logger.info("开启timeout定时器，请求机器人进入房间");
	self.timeoutID = setTimeout(function () {
		var param = {
			minGold: self.roomConfig.limitMin,
			maxGold: self.roomConfig.limitMax,
		};

		logger.info("rpc调用请求机器人");
		logger.info(JSON.stringify(param));

		self.app.rpc.auth.robotRemote.reqOneRobot({}, param, function (err, resp) {
			if (err) {
				logger.error(err);
			} else {
				if (resp) {
					self.enterRoom(resp, true);
				}
			}
		});
	}, MjConsts.OPE_TIME.ReqRobotTime);
};

pro.clearTimeoutTimer = function () {
	if (this.timeoutID) {
		logger.info("清除已有timeout定时器");
		clearTimeout(this.timeoutID);
		this.timeoutID = null;
	}
};

pro.clearIntervalTimer = function () {
	if (this.intervalID) {
		logger.info("清除已有interval定时器");
		clearInterval(this.intervalID);
		this.intervalID = null;
	}
};

//清空房间
pro.clearRoom = function () {
	//清理计时器
	this.clearTimeoutTimer();
	this.clearIntervalTimer();

	//销毁channel
	this.channelService.destroyChannel(this.roomData.roomNum);

	//清空数据
	this.roomConfig = null;
	this.channel = null;
	this.userList = {};
	this.roomData = {};
	this.gameData = {};
	
	//还原房间状态
	this.roomState = Consts.ROOM.STATE.UN_INITED;
};
/////////////////////////////////////功能函数end/////////////////////////////////////

module.exports = Room;