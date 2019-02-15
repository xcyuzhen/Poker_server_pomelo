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
    this.roomList = []; 						//房间列表
    this.readyRoomList = [];					//等待开局的房间
    this.roomMap = {}; 							//有房间号的roomMap
    this.gameConfig = null;
};

module.exports = RoomMgrService;

var pro = RoomMgrService.prototype;

pro.start = function(cb) {
	process.nextTick(cb);
};

//初始化游戏配置
pro.initGameConfig = function (gameConfig) {
	this.gameConfig = gameConfig;
}

//初始化房间
pro.initRooms = function (RoomObj) {
	for (var i = 1; i <= Consts.ROOM_SERVICE.ROOM_NUM; i++)
	{ 
	    var room = new RoomObj(this.app, {roomIndex: i});
	    this.roomList.push(room);
	}
}

//回收房间
pro.recycleRoom = function (roomIndex) {
	console.log("HHHHHHHHHHHHHHHHHHHHH 回收房间, roomIndex = ", roomIndex);

	for (var roomNum in this.roomMap) {
		var room = this.roomMap[roomNum];
		if (room.roomIndex === roomIndex) {
			delete(this.roomMap[roomNum]);
			break;
		}
	}

	for (var i = 0, len = this.readyRoomList.length; i < len; i++) {
		var room = this.readyRoomList[i];
		if (room.roomIndex === roomIndex) {
			this.readyRoomList.splice(i, 1);
			this.roomList.push(room);
			return;
		}
	}
}

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
	console.log("开始查找玩家所在房间");

	//遍历人数已经满的房间
	for (var roomNum in this.roomMap) {
		console.log("查找房间号：", roomNum);
		var tmpRoom = this.roomMap[roomNum];
		if (tmpRoom.isUserInRoom(mid)) {
			console.log("找到玩家所在房间");
	    	return tmpRoom;
	    }
	}

	return null;
};
/////////////////////////////////////功能函数end/////////////////////////////////////

/////////////////////////////////////协议处理相关begin/////////////////////////////////////
pro.socketMsg = function (mid, msg, cb) {
	var self = this;

	var msgSocketCmd = msg.socketCmd;
	var processerFun = socketCmdConfig[msgSocketCmd];
	if (!! processerFun && self[processerFun]) {
		self[processerFun](mid, msg, cb);
	} else {
		//通用处理
		self.commonRoomMsgHandler(mid, msg, cb);
	}
};

//通用房间消息处理函数
pro.commonRoomMsgHandler = function (mid, msg, cb) {
	var self = this;

	var room = getRoomByMid.call(self, mid);
	if (!!room) {
		room.commonRoomMsgHandler(mid, msg, cb);
	} else {
		utils.invokeCallback(cb, null);
	}
};

//请求加入场次
pro.enterGroupLevel = function (mid, msg, cb) {
	console.log("玩家请求进入房间 mid = ", mid);
	var self = this;
	var level = msg.level;

	//找到场次配置
	var config;
	var groupConfig = self.gameConfig.groupList;
	for(var i = 0, len = groupConfig.length; i < len; i++){
		var tmpConfig = groupConfig[i];
		if (tmpConfig.level == level) {
			config = tmpConfig;
			break;
		}
	}

	if (!config) {
		logger.error('没有找到场次配置 level = ' + level);
		utils.invokeCallback(cb);
		return;
	}

	//redis中读取玩家信息
	redisUtil.getCommonUserData(mid, function (err, userData) {
		if (!err) {
			//判断玩家金币数量是否符合要求
			var userGoldNum = userData.gold;
			if (userGoldNum < config.limitMin) {
				utils.invokeCallback(cb, null, {code: Code.ROOM.GOLD_NOT_ENOUGH, msg:"金币低于本场次下限"});
				return;
			} else if (userGoldNum > config.limitMax) {
				utils.invokeCallback(cb, null, {code: Code.ROOM.GOLD_MORE_ENOUGH, msg:"金币高于本场次上限"});
				return;
			} else {
				utils.invokeCallback(cb, null, {code: Code.OK});

				//1.查找等待开局的房间列表;
				var room;
				for(var i = 0, len = self.readyRoomList.length; i < len; i++){
					var tmpRoom = self.readyRoomList[i];
					var roomLevel = tmpRoom.getGroupLevel();
					if (roomLevel == level && (!tmpRoom.isRoomFull)) {
						room = tmpRoom;
						break;
					}
				}

				if (!room) {
					//2.等待开局房间列表没有符合场次，初始化一个空房间;
					var emptyRoom = self.roomList.splice(0, 1)[0];

					//初始化空房间
					emptyRoom.initRoom(config);

					//将房间添加进正在等待开局房间列表
					self.readyRoomList.push(emptyRoom);

					//将房间添加进roomMap
					var roomNum = emptyRoom.getRoomNumber();
					self.roomMap[roomNum] = emptyRoom;

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

//请求退出房间
pro.userLeave = function (mid, msg, cb) {
	var self = this;

	console.log("玩家" + mid + "，申请离开房间");
	//找到玩家所在房间，离开房间操作在房间内完成
	var room = getRoomByMid.call(self, mid);
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
	[SocketCmd.USER_LEAVE]: "userLeave",
};

/////////////////////////////////////协议处理相关end/////////////////////////////////////