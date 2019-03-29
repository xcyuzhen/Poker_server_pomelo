var logger = require('pomelo-logger').getLogger(__filename);
var SocketCmd = require('../models/socketCmd');
var utils = require('../util/utils');
var MjConsts = require('../consts/mjConsts');

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
	this.tingList = []; 									//听牌列表

	this.timeoutID = null; 									//延时定时器
	this.intervalID = null; 								//循环计时ID
	this.leaveRoomTimeoutID = null; 						//离开房间延时定时器
};

var pro = UserItem.prototype;

/**
 * 导出前端的userData
 *
 * @return {Object}
 */
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
	data.handCardsNum = this.handCards.length;
	data.tingList = this.tingList;

	return data;
};

/**
 * 导出前端玩家座位信息
 *
 * @return {Object}
 */
pro.exportClientRoomData = function () {
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

/**
 * 导出前端的gameData
 *
 * @return {Object}
 */
pro.exportClientGameData = function (mid) {
	var data = {};

	//玩家牌局数据
	data.mid = this.mid;
	data.gold = this.gold;
	data.diamond = this.diamond;
	data.outCards = this.outCards;
	data.extraCards = this.extraCards;
	data.handCardsNum = this.handCards.length;
	data.tingList = this.tingList;
	if (mid == this.mid) {
		data.handCards = this.handCards.concat();
	} else {
		data.handCards = [];
	}

	return data;
};

/**
 * 机器人接收到的推送消息
 *
 * @param  {Object}   	param 			推送消息
 * @return {Void}
 */
pro.onSocketMsg = function (param) {
	var self = this;

	var res = param.res;
	var socketCmd = res.socketCmd;

	switch (socketCmd) {
		case SocketCmd.UPDATE_USER_LIST:
			//如果没有了真实玩家，延时离开房间
			var realPlayerNum = self.room.getRealUserNum();
			if (realPlayerNum == 0) {
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
			if (self.ready == 0) {
				var delayTime = utils.randomNum(100, 200);
				self.timeoutID = setTimeout(function () {
					self.room.userReady(self.mid);
				}, delayTime);
			}

			break;
		case SocketCmd.ROUND_INFO:
			//判断自己是否有其他操作，操作优先级(胡、杠、碰)
			if (res.curOpeMid == self.mid) {

			}

			//判断是否轮到自己出牌

			break;
		default:
	}
};

/**
 * 检测是否可以碰牌
 *
 * @param  {Number}   	cardValue 			检测的牌值
 * @return {Boolean} 	false-不能碰 true-能碰
 */
pro.checkPeng = function (cardValue) {
	if (!cardValue) {
		return false;
	}

	var num = 0;

	for (var i = this.handCards.length - 1; i >= 0; i--) {
		if (cardValue == this.handCards[i]) {
			num ++;
		}
	}

	if (num >= 2) {
		return true;
	}

	return false;
};

//检测是否可以明杠
/**
 * 玩家退出登录
 *
 * @param  {Number}   	cardValue 			检测的牌值
 * @return {Boolean} 	false-不能明杠 true-能明杠
 */
pro.checkGang = function (cardValue) {
	if (!cardValue) {
		return false;
	}

	var num = 0;

	for (var i = this.handCards.length - 1; i >= 0; i--) {
		if (cardValue == this.handCards[i]) {
			num ++;
		}
	}

	if (num >= 3) {
		return true;
	}

	return false;
};

/**
 * 检测是否有暗杠
 *
 * @return {Array} 		暗杠牌值列表
 */
pro.checkAnGang = function () {
	var resultArr = [];

	var statList = {};
	for (var i = this.handCards.length - 1; i >= 0; i--) {
		var cardValue = this.handCards[i];
		statList[cardValue] = statList[cardValue] || 0;
		statList[cardValue] ++;

		if (statList[cardValue] == 4) {
			resultArr.push(cardValue);
		}
	}

	return resultArr;
};

/**
 * 检测是否可以补杠
 *
 * @return {Array} 		补杠牌值列表
 */
pro.checkBuGang = function () {
	var resultArr = [];

	for (var i = this.extraCards.length - 1; i >= 0; i--) {
		var extraItem = this.extraCards[i];
		if (extraItem[opeType] == mjConsts.OPE_TYPE.PENG) {
			var extraData = extraItem.opeData;
			for (var j = this.handCards.length - 1; j >= 0; j--) {
				if (extraData == this.handCards[j]) {
					resultArr.push(extraData);
					break;
				}
			}
		}
	}

	return resultArr;
};

/**
 * 检测是否胡牌
 *
 * @return {Boolean} 	false-不能胡牌 true-能胡牌
*/
pro.checkHuPai = function () {
	return false;
};

/**
 * 清除延时定时器
 *
 * @return {Void}
*/
pro.clearTimeoutTimer = function () {
	if (this.timeoutID) {
		clearTimeout(this.timeoutID);
		this.timeoutID = null;
	}
};

/**
 * 清除循环定时器
 *
 * @return {Void}
*/
pro.clearIntervalTimer = function () {
	if (this.intervalID) {
		clearInterval(this.intervalID);
		this.intervalID = null;
	}
};

/**
 * 清除离开房间延时定时器
 *
 * @return {Void}
*/
pro.clearLeaveRoomTimeoutTimer = function () {
	if (this.leaveRoomTimeoutID) {
		clearTimeout(this.leaveRoomTimeoutID);
		this.leaveRoomTimeoutID = null;
	}
};

/**
 * 清理工作
 *
 * @return {Void}
*/
pro.clean = function () {
	this.clearTimeoutTimer();
	this.clearIntervalTimer();
	this.clearLeaveRoomTimeoutTimer();
};

module.exports = UserItem;