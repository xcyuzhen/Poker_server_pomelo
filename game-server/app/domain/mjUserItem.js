var logger = require('pomelo-logger').getLogger(__filename);
var SocketCmd = require('../models/socketCmd');
var utils = require('../util/utils');

var UserItem = function (room, data) {
	this.room = room;

	//玩家信息
	this.mid = parseInt(data.mid) || 0;
	this.nick = data.nick || "";
	this.sex = parseInt(data.sex) || 0,
	this.gold = parseInt(data.gold) || 0,
	this.diamond = parseInt(data.diamond) || 0,
	this.head_url = data.head_url || "",
	this.seatID = parseInt(data.seatID) || 0,
	this.ready = parseInt(data.ready) || 0,
	this.online = parseInt(data.online) || 1,
	this.robot = parseInt(data.robot) || 0,

	//玩家牌局数据
	this.handCards = []; 									//手牌列表
	this.staHandCards = {}; 								//手牌统计
	this.outCards = []; 									//出牌列表
	this.extraCards = []; 									//吃碰杠牌的列表
	this.handCardsNum = 0; 									//手牌张数
	this.tingList = []; 									//听牌列表

	this.timeoutID = null; 									//延时定时器
	this.intervalID = null; 								//循环计时ID
	this.leaveRoomTimeoutID = null; 						//离开房间延时定时器
};

var pro = UserItem.prototype;

//导出前端的userData
pro.exportClientData = function () {
	var data = {};

	//玩家座位信息
	data.mid = this.mid;
	data.nick = this.nick;
	data.sex = this.sex;
	data.gold = this.gold;
	data.diamond = this.diamond;
	data.head_url = this.head_url;
	data.seatID = this.seatID;
	data.ready = this.ready;
	data.online = this.online;

	//玩家牌局数据
	data.handCards = this.handCards;
	data.outCards = this.outCards;
	data.extraCards = this.extraCards;
	data.handCardsNum = this.handCardsNum;
	data.tingList = this.tingList;

	return data;
};

//导出前端玩家座位信息
pro.exportClientGameData = function () {
	var data = {};

	//玩家座位信息
	data.mid = this.mid;
	data.nick = this.nick;
	data.sex = this.sex;
	data.gold = this.gold;
	data.diamond = this.diamond;
	data.head_url = this.head_url;
	data.seatID = this.seatID;
	data.ready = this.ready;
	data.online = this.online;

	return data;
};

//导出前端的gameData
pro.exportClientGameData = function () {
	var data = {};

	//玩家牌局数据
	data.handCards = this.handCards;
	data.outCards = this.outCards;
	data.extraCards = this.extraCards;
	data.handCardsNum = this.handCardsNum;
	data.tingList = this.tingList;

	return data;
};

//机器人接收到的推送消息
pro.onSocketMsg = function (param) {
	var self = this;

	var res = param.res;
	var socketCmd = res.socketCmd;

	switch (socketCmd) {
		case SocketCmd.UPDATE_USER_LIST:
			//如果没有了真实玩家，延时离开房间
			var realPlayerNum = self.room.getRealUserNum();
			if (realPlayerNum === 0) {
				if (!self.leaveRoomTimeoutID) {
					var delayTime = utils.randomNum(100, 300);

					self.leaveRoomTimeoutID = setTimeout(function () {
						self.room.leaveRoom(self.mid);
					}, delayTime);
				}
			} else {
				self.clearLeaveRoomTimeoutTimer();
			}

			//如果房间人数不满，清除延时定时器定时器
			var isRoomFull = self.room.isRoomFull();
			if (!isRoomFull) {
				self.clearTimeoutTimer();
			}

			break;
		case SocketCmd.WAIT_USER_READY:
			self.clearTimeoutTimer();
			if (self.ready === 0) {
				var delayTime = utils.randomNum(100, 200);
				self.timeoutID = setTimeout(function () {
					self.room.userReady(self.mid);
				}, delayTime);
			}

			break;
		default:
	}
};

pro.clearTimeoutTimer = function () {
	if (this.timeoutID) {
		clearTimeout(this.timeoutID);
		this.timeoutID = null;
	}
};

pro.clearIntervalTimer = function () {
	if (this.intervalID) {
		clearInterval(this.intervalID);
		this.intervalID = null;
	}
};

pro.clearLeaveRoomTimeoutTimer = function () {
	if (this.leaveRoomTimeoutID) {
		clearTimeout(this.leaveRoomTimeoutID);
		this.leaveRoomTimeoutID = null;
	}
};

//清理工作
pro.clean = function () {
	this.clearTimeoutTimer();
	this.clearIntervalTimer();
	this.clearLeaveRoomTimeoutTimer();
};

module.exports = UserItem;