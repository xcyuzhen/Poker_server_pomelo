var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var Consts = require('../consts/consts');
var MjConsts = require('../consts/mjConsts');
var utils = require('../util/utils');
var redisUtil = require("../util/redisUtil");
var GameConfig = require('../models/gameConfig');
var Code = require('../../../shared/code');
var UserData = require('../userData/mjUserData');
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
	this.roomData.roomNum = roomNum;
	this.roomData.maxPlayerNum = 3;
	this.roomData.curPlayerNum = 0;

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
pro.enterRoom = function (mid) {
	console.log("玩家进入房间 mid = ", mid);
	var self = this;

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
					var userData = new UserData(userDataAll);

					//初始化玩家的位置
					userData.seatID = getAvailableSeatID.call(self);

					console.log("玩家座位号： ", userData.seatID);

					//将玩家添加进玩家列表
					self.userList[mid] = userData;

					//将座位号添加到座位mid映射表中
					self.gameData.seatMidMap[userData.seatID] = mid;

					//将玩家添加进channel
					self.channel.add(mid, userDataAll.sid);

					//组装发给客户端的userList
					var clientUserList = {};
					//已经在房间的玩家
					var otherUidList = [];
					//当前玩家人数
					var curPlayerNum = 0;
					for (var tMid in self.userList) {
						var tUserData = self.userList[tMid];
						clientUserList[tMid] = tUserData.exportClientData();

						if (tMid !== mid) {
							otherUidList.push({uid: tMid, sid: self.channel.getMember(tMid)['sid']});
						}

						curPlayerNum++;
					}

					//记录当前玩家人数
					self.roomData.curPlayerNum = curPlayerNum;

					//将房间全部信息发给刚进入的玩家
					var param = {
						groupName: MjConsts.MSG_GROUP_NAME,
						res: {
							sockeCmd: SocketCmd.ENTER_ROOM,
							roomData: self.roomData,
							userList: clientUserList,
						},
					};
					var uidList = [{uid: mid, sid: self.channel.getMember(mid)['sid']}]
					self.channelService.pushMessageByUids("onSocketMsg", param, uidList, {}, function (err) {
						if (err) {
							logger.error("mjRoom.enterRoom 返回玩家进入房间失败, err = ", err);
						}
					});

					//通知其他玩家有新玩家加入
					if (otherUidList.length > 0) {
						var param = {
							groupName: MjConsts.MSG_GROUP_NAME,
							res: {
								sockeCmd: SocketCmd.USER_ENTER,
								userData: userData.exportClientData(),
							},
						};
						self.channel.pushMessageByUids("onSocketMsg", param, otherUidList, {}, function (err) {
							if (err) {
								logger.error("mjRoom.enterRoom 通知其他玩家有新玩家加入失败, err = ", err);
							}
						});
					}
				}
			});
		}
	});
};

//玩家请求离开房间
pro.leaveRoom = function (mid, cb) {
	var self = this;

	console.log("玩家离开房间 mid = ", mid);
	if (self.roomState === Consts.ROOM.STATE.PLAYING) {
		utils.invokeCallback(cb, null, {
			code: Code.ROOM.GAME_PLAYING,
			msg: "牌局进行中无法退出房间",
		});
		return;
	}

	//将该玩家从channel中踢出
	redisUtil.getUserDataByField(mid, ["sid"], function(err, resp) {
		if (err) {
			logger.error("mjRoom.leaveRoom 获取玩家sid失败");
		} else {
			self.channel.leave(mid, resp[0]);

			var userData = self.userList[mid];

			//删除座位mid映射数据
			delete(self.seatMidMap[userData.seatID]);

			//删除该玩家数据
			delete(self.userList[mid]);
			redisUtil.leaveRoom(mid);

			//记录当前玩家人数
			self.roomData.curPlayerNum--;

			//如果该房间所有玩家都已经离开，回收该房间
			console.log("房间剩余人数 playerNum = ", self.roomData.curPlayerNum);
			if (self.roomData.curPlayerNum === 0) {
				self.clearRoom();
				self.roomMgrService.recycleRoom(self.roomIndex);
			} else {
				var otherUidList = [];
				for (var tMid in self.userList) {
					otherUidList.push({uid: tMid, sid: self.channel.getMember(tMid)['sid']});
				}

				//通知其他人该玩家离开
				if (otherUidList.length > 0) {
					var param = {
						groupName: MjConsts.MSG_GROUP_NAME,
						res: {
							sockeCmd: SocketCmd.USER_LEAVE,
							mid: mid;
						},
					};
					self.channel.pushMessageByUids("onSocketMsg", param, otherUidList, {}, function (err) {
						if (err) {
							logger.error("mjRoom.leaveRoom 通知其他玩家有新玩家离开房间失败, err = ", err);
						}
					});
				}
			}

			utils.invokeCallback(cb, null, {
				code: Code.OK,
			});
		}
	});
};

//玩家掉线
pro.userOffline = function (mid) {
	var self = this;

	if (self.roomState === Consts.ROOM.STATE.PLAYING) {
		//玩家在游戏中，修改该玩家的在线状态
		var userData = self.userList[mid];
		userData.online = 0;

		//广播该玩家掉线的消息
	} else {
		self.leaveRoom(mid);
	}
};

//清空房间
pro.clearRoom = function () {
	this.channelService.destroyChannel(this.roomData.roomNum);

	this.roomConfig = null;
	this.channel = null;
	this.userList = {};
	this.roomData = {};
	this.gameData = {};
	
	this.roomState = Consts.ROOM.STATE.UN_INITED;
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
	return this.roomData.curPlayerNum === this.maxPlayerNum;
}

//玩家是否在房间中
pro.isUserInRoom = function (mid) {
	if (this.userList[mid]) {
		return true;
	}

	return false;
};

/////////////////////////////////////功能函数begin/////////////////////////////////////
//获取可用的座位号
var getAvailableSeatID = function () {
	var seatUse = [];

	//将已经被占用的座位添加列表
	for (var mid in this.userList) {
		var userData = thi.userList[mid];
		seatUse[userData.seatID] = true;
	}

	for (var i = 1; i <= this.roomData.maxPlayerNum; i++) {
		if (!seatUse[i]) {
			return i;
		}
	}
}

//导出发送给客户端的roomData
var exportRoomData = function () {
	var data = {};
	data.
}
/////////////////////////////////////功能函数end/////////////////////////////////////

module.exports = Room;