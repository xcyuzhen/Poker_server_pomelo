var pomelo = require('pomelo');
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

	//玩家结算数据
	this.rateList = []; 									//输赢倍数列表
	this.roundScore = 0; 									//单局输赢分值
	this.totalScore = 0; 									//总输赢分值

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
	data.handCards = utils.clone(this.handCards);
	data.outCards = utils.clone(this.outCards);
	data.extraCards = utils.clone(this.extraCards);
	data.handCardsNum = this.handCards.length;
	data.tingList = utils.clone(this.tingList);

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
	data.outCards = utils.clone(this.outCards);
	data.extraCards = utils.clone(this.extraCards);
	data.handCardsNum = this.handCards.length;
	data.tingList = utils.clone(this.tingList);
	// if (mid == this.mid) {
		data.handCards = utils.clone(this.handCards);
	// } else {
	// 	data.handCards = [];
	// }

	return data;
};

/**
 * 导出前端的resultData
 *
 * @return {Object}
 */
pro.exportClientResultData = function () {
	var data = {};

	data.mid = this.mid;
	data.nick = this.nick;
	data.head_url = this.head_url;
	data.gold = this.gold;
	data.diamond = this.diamond;

	data.extraCards = utils.clone(this.extraCards);
	data.handCards = utils.clone(this.handCards);
	data.rateList = utils.clone(this.rateList);
	data.roundScore = this.roundScore;
	data.totalScore = this.totalScore;

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
			self.aiUpdataUserList(res);

			break;
		case SocketCmd.WAIT_USER_READY:
			self.aiWaitUserReady(res);

			break;
		case SocketCmd.ROUND_INFO:
			self.aiRoundInfo(res);

			break;
		default:
	}
};

/**
 * 自动打牌(倒计时结束)
 *
 * @return {Void}
*/
pro.autoOutCard = function () {
	//打最后一张牌
	var lastCard = this.handCards[this.handCards.length - 1];
	this.room.userOpeRequest(this.mid, {opeType: MjConsts.OPE_TYPE.OUT_CARD, opeData: lastCard});
};

///////////////////////////////////////////////ai操作begin///////////////////////////////////////////////
/**
 * 机器人处理等待玩家准备消息
 *
 * @return {Void}
*/
pro.aiWaitUserReady = function (res) {
	var self = this;

	self.clearTimeoutTimer();
	if (self.ready == 0) {
		var delayTime = utils.randomNum(MjConsts.ROBOT.AutoReadyTime.Min, MjConsts.ROBOT.AutoReadyTime.Max);
		self.startTimeoutTimer(delayTime, function () {
			self.room.userReady(self.mid);
		})
	}
};

/**
 * 机器人处理刷新玩家列表消息
 *
 * @return {Void}
*/
pro.aiUpdataUserList = function (res) {
	var self = this;

	//如果没有了真实玩家，延时离开房间
	var realPlayerNum = self.room.getRealUserNum();
	if (realPlayerNum == 0) {
		if (!self.leaveRoomTimeoutID) {
			var delayTime = utils.randomNum(MjConsts.ROBOT.UpDataUserListLeave.Min, MjConsts.ROBOT.UpDataUserListLeave.Max);

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
};

/**
 * 机器人处理回合消息
 *
 * @return {Void}
*/
pro.aiRoundInfo = function (res) {
	var self = this;

	if (res.curOpeMid == self.mid) {
		var curOpeList = res.curOpeList;
		if (curOpeList.length > 0) {
			var hasPengOpe = false;
	        var pengData;
	        var hasGangOpe = false;
	        var gangOpeList = [];
	        var hasHuOpe = false;
	        var huData;

	        for (var i = 0; i < curOpeList.length; i++) {
	        	var opeType = curOpeList[i].opeType;
	        	var opeData = curOpeList[i].opeData;

	            switch (opeType) {
	                case MjConsts.OPE_TYPE.PENG:
	                    hasPengOpe = true;
	                    pengData = opeData;
	                    break;
	                case MjConsts.OPE_TYPE.GANG:
	                case MjConsts.OPE_TYPE.BU_GANG:
	                case MjConsts.OPE_TYPE.AN_GANG:
	                    hasGangOpe = true;
	                    gangOpeList.push({opeType: opeType, opeData: opeData});
	                    break;
	                case MjConsts.OPE_TYPE.HU:
	                    hasHuOpe = true;
	                    huData = opeData;
	                    break;
	            }
	        }

	        var resultOpeType, resultOpeData;
	        if (hasHuOpe) {
	        	resultOpeType = MjConsts.OPE_TYPE.HU;
	        	resultOpeData = huData
	        } else if (hasGangOpe) {
	        	var randomIndex = utils.randomNum(0, gangOpeList.length-1);
	        	var gangOpeItem = gangOpeList[randomIndex];

	        	resultOpeType = gangOpeItem.opeType;
	        	resultOpeData = gangOpeItem.opeData;
	        } else if (hasPengOpe) {
	        	resultOpeType = MjConsts.OPE_TYPE.PENG;
	        	resultOpeData = pengData;
	        }

	        var delayTime = utils.randomNum(MjConsts.ROBOT.AutoOpeTime.Min, MjConsts.ROBOT.AutoOpeTime.Max);
	        self.startTimeoutTimer(delayTime, function () {
	        	self.room.userOpeRequest(self.mid, {opeType: resultOpeType, opeData: resultOpeData});
	        });
		} else {
			//打牌操作
			self.aiOutCard();
		}
	}
};

/**
 * 机器人打牌
 *
 * @return {Void}
*/
pro.aiOutCard = function () {
	var self = this;

	var lastCard = self.handCards[self.handCards.length - 1];
	var delayTime = utils.randomNum(MjConsts.ROBOT.AutoOutCardTime.Min, MjConsts.ROBOT.AutoOutCardTime.Max);
    self.startTimeoutTimer(delayTime, function () {
    	self.room.userOpeRequest(self.mid, {opeType: MjConsts.OPE_TYPE.OUT_CARD, opeData: lastCard});
    });
}
///////////////////////////////////////////////ai操作end///////////////////////////////////////////////

/**
 * 游戏开始
 *
 * @return {Void}
 */
pro.gameStart = function () {
	//清空单局游戏数据
	this.handCards = [];
	this.staHandCards = {};
	this.outCards = [];
	this.extraCards = [];
	this.tingList = [];

	this.rateList = [];
	this.roundScore = 0;
};

/**
 * 添加倍数项
 *
 * @param  {Object}   	rateItem 			倍数项
 * @return {Void}
 */
pro.addRateItem = function (rateItem) {
	var baseRate = this.room.roomConfig.base;
	var totalRate = 0;

	//已有该类型倍数项，直接倍数相加
	//没有该类型倍数项，添加
	var find = false;
	for (var i = 0; i < this.rateList.length; i++) {
		var tmpRateItem = this.rateList[i];
		if (rateItem.rateType == tmpRateItem.rateType && !find) {
			find = true;
			tmpRateItem.rateValue += rateItem.rateValue;
		}

		totalRate += tmpRateItem.rateValue;
	}

	if (!find) {
		this.rateList.push(rateItem);
		totalRate += rateItem.rateValue;
	}

	//重新计算单局赢分
	this.roundScore = baseRate * totalRate;
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
		if (extraItem.opeType == MjConsts.OPE_TYPE.PENG) {
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
	var huApi = pomelo.app.get("MjHuApi");
	return huApi.checkHu(this.handCards);
};

/**
 * 开始延时定时器
 *
 * @param  	{Number}   	time 			延时时间
 * @param  	{Function} 	cb 				回调
 * @return 	{Void}
*/
pro.startTimeoutTimer = function (time, cb) {
	var self = this;
	self.clearTimeoutTimer();
	self.timeoutID = setTimeout(cb, time);
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