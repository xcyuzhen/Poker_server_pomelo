var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../util/utils');
var redisUtil = require("../util/redisUtil");
var Consts = require('../consts/consts');
var SocketCmd = require('../models/socketCmd');
var async = require('async');
var Code = require('../../../shared/code');

/**
 * 房间管理服务.
 *
 * RoomMgrService is created by roomMgr component
 * component of pomelo and roomMgr service would be accessed by `app.get('roomMgrService')`.
 *
 * @class
 * @constructor
 */
var RoomMgrService = function(app, opts) {
	opts = opts || {};
    this.app = app;
    this.m_roomList = []; 						//房间列表
    this.m_readyRoomList = [];					//等待开局的房间
    this.m_roomMap = {}; 						//有房间号的roomMap
    this.m_gameConfig = null;
    this.m_isFriendRoomServer = false; 			//是否是好友房服务器
};

module.exports = RoomMgrService;

var pro = RoomMgrService.prototype;

pro.start = function(cb) {
	process.nextTick(cb);
};

//服务器是否满员
pro.getServerFullStatus = function (msg, cb) {
	var self = this;

	var hasEmptyRoomNum = self.m_roomList.length > 0;
	if (hasEmptyRoomNum) {
		utils.invokeCallback(cb, null, {canEnter: true});
	} else {
		if (self.m_isFriendRoomServer) {
			utils.invokeCallback(cb, null, {canEnter: false});
		} else {
			//查找等待开局的房间列表;
			var found = false;
			for(var i = 0, len = self.m_readyRoomList.length; i < len; i++){
				var tmpRoom = self.m_readyRoomList[i];
				if (!tmpRoom.isRoomFull()) {
					found = true;
					break;
				}
			}

			utils.invokeCallback(cb, null, {canEnter: found});
		}
	}
};

//服务器是否满员
pro.exitRoomByRoomNum = function (roomNum, cb) {
	roomNum = parseInt(roomNum);
	if (this.m_roomMap[roomNum]) {
		utils.invokeCallback(cb, null, {exit: true});
	}

	utils.invokeCallback(cb, null, {exit: false});
};

//初始化游戏配置
pro.initGameConfig = function (gameConfig) {
	this.m_gameConfig = gameConfig;
};

//设置是否是好友房服务器
pro.setIsFriendRoomServer = function (isFriendRoomServer) {
	this.m_isFriendRoomServer = !!isFriendRoomServer;
};

//初始化房间
pro.initRooms = function (RoomObj) {
	for (var i = 1; i <= Consts.ROOM_SERVICE.ROOM_NUM; i++)
	{ 
	    var room = new RoomObj(this.app, {roomIndex: i, gameConfig:this.m_gameConfig});
	    this.m_roomList.push(room);
	}
};

//回收房间
pro.recycleRoom = function (roomNum) {
	console.log("HHHHHHHHHHHHHHHHHHHHH 回收房间, roomNum = ", roomNum);

	if (this.m_roomMap[roomNum]) {
		delete(this.m_roomMap[roomNum]);
	}

	for (var i = 0, len = this.m_readyRoomList.length; i < len; i++) {
		var room = this.m_readyRoomList[i];
		if (room.getRoomNumber() == roomNum) {
			this.m_readyRoomList.splice(i, 1);
			this.m_roomList.push(room);
			break;
		}
	}
};

//玩家离线
pro.userOffline = function (mid, cb) {
	var self = this;

	var room = getRoomByMid.call(self, mid);
	if (room) {
		room.userOffline(mid);
	} else {
		console.log("没有找到玩家所在房间");
		redisUtil.logout(mid);
	}

	utils.invokeCallback(cb, null);
};

/////////////////////////////////////功能函数begin/////////////////////////////////////
//查找用户所在房间
var getRoomByMid = function (mid) {
	for (var roomNum in this.m_roomMap) {
		var tmpRoom = this.m_roomMap[roomNum];
		if (tmpRoom.isUserInRoom(mid)) {
	    	return tmpRoom;
	    }
	}
};
/////////////////////////////////////功能函数end/////////////////////////////////////

/////////////////////////////////////协议处理相关begin/////////////////////////////////////
pro.socketMsg = function (mid, roomNum, msg, cb) {
	var self = this;

	var msgSocketCmd = msg.socketCmd;
	var processerFun = socketCmdConfig[msgSocketCmd];
	if (!! processerFun && self[processerFun]) {
		self[processerFun](mid, roomNum, msg, cb);
	} else {
		//通用处理
		self.commonRoomMsgHandler(mid, roomNum, msg, cb);
	}
};

//通用房间消息处理函数
pro.commonRoomMsgHandler = function (mid, roomNum, msg, cb) {
	var self = this;

	var room = self.m_roomMap[roomNum] || getRoomByMid.call(self, mid);
	if (!!room) {
		room.commonRoomMsgHandler(mid, msg, cb);
	} else {
		utils.invokeCallback(cb, null);
	}
};

//请求加入场次
pro.enterGroupLevel = function (mid, roomNum, msg, cb) {
	console.log("玩家请求进入房间 mid = ", mid);
	var self = this;

	//redis中读取玩家信息
	redisUtil.getCommonUserData(mid, function (err, userData) {
		if (!err) {
			//判断玩家金币数量是否符合要求
			var userGoldNum = userData.gold;
			if (userGoldNum < self.m_gameConfig.limitMin) {
				utils.invokeCallback(cb, null, {code: Code.ROOM.GOLD_NOT_ENOUGH, msg:"金币低于本场次下限"});
				return;
			} else if (userGoldNum > self.m_gameConfig.limitMax) {
				utils.invokeCallback(cb, null, {code: Code.ROOM.GOLD_MORE_ENOUGH, msg:"金币高于本场次上限"});
				return;
			} else {
				utils.invokeCallback(cb, null, {code: Code.OK});

				//1.查找等待开局的房间列表;
				var room;
				for(var i = 0, len = self.m_readyRoomList.length; i < len; i++){
					var tmpRoom = self.m_readyRoomList[i];
					if (!tmpRoom.isRoomFull()) {
						room = tmpRoom;
						break;
					}
				}

				if (!room) {
					//2.等待开局房间列表没有符合场次，初始化一个空房间;
					var emptyRoom = self.m_roomList.splice(0, 1)[0];

					//初始化空房间
					emptyRoom.initRoom();

					//将房间添加进正在等待开局房间列表
					self.m_readyRoomList.push(emptyRoom);

					//将房间添加进roomMap
					roomNum = emptyRoom.getRoomNumber();
					self.m_roomMap[roomNum] = emptyRoom;

					console.log("创建新房间，准备进入，roomNum = ", roomNum)

					//将玩家加入该房间
					emptyRoom.enterRoom(mid);
				} else {
					console.log("找到人未满的房间，准备进入，roomNum = ", room.getRoomNumber())
					//3.等待开局房间列表中找到符合条件的房间，将玩家加入;
					room.enterRoom(mid);
				}
			}
		}
	});
};

//请求创建好友房
pro.createFriendRoom = function (mid, roomNum, msg, cb) {
	var self = this;

	self.app.rpc.auth.roomNumRemote.reqOneRoomNum({}, function (err, resp) {
		if (err) {
			logger.error(err);
			utils.invokeCallback(cb, err);
		} else {
			console.log("申请到房间号：", resp);
			utils.invokeCallback(cb, null, {code: Code.OK});
			var emptyRoom = self.m_roomList.splice(0, 1)[0];

			//房间参数
			var param = {
				roomNum: parseInt(resp),
				isFriendRoom: true,
				maNum: msg.maNum,
				roundNum: msg.roundNum,
			};

			//初始化空房间
			emptyRoom.initRoom(param);

			//将房间添加进正在等待开局房间列表
			self.m_readyRoomList.push(emptyRoom);

			//将房间添加进roomMap
			roomNum = emptyRoom.getRoomNumber();
			self.m_roomMap[roomNum] = emptyRoom;

			//玩家进入房间
			emptyRoom.enterRoom(mid);
		}
	});
};

//请求退出房间
pro.userLeave = function (mid, roomNum, msg, cb) {
	var self = this;

	console.log("玩家" + mid + "，申请离开房间");
	//找到玩家所在房间，离开房间操作在房间内完成
	var room = self.m_roomMap[roomNum] || getRoomByMid.call(self, mid);
	if (!!room) {
		room.leaveRoom(mid, cb);
	} else {
		//没有找到玩家所在房间，直接修改玩家信息
		console.log("玩家" + mid + "，redis中修改玩家信息");
		redisUtil.leaveRoom(mid, function () {
			utils.invokeCallback(cb, null);
		});
	}
};

var socketCmdConfig = {
	[SocketCmd.ENTER_GROUP_LEVEL]: "enterGroupLevel",
	[SocketCmd.CREATE_FRIEND_ROOM]: "createFriendRoom",
	[SocketCmd.USER_LEAVE]: "userLeave",
};

/////////////////////////////////////协议处理相关end/////////////////////////////////////