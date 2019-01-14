var logger = require('pomelo-logger').getLogger(__filename);

var UserData = function (data) {
	//玩家信息
	this.mid = data.mid || 0;
	this.nick = data.nick || "";
	this.sex = data.sex || 0,
	this.gold = data.gold || 0,
	this.diamond = data.diamond || 0,
	this.head_url = data.head_url || "",
	this.seatID = data.seatID || 0,
	this.ready = data.ready || 0,
	this.online = data.online || 1,

	//玩家牌局数据
	this.handCards = []; 						//手牌列表
	this.staHandCards = {}; 					//手牌统计
	this.outCards = []; 						//出牌列表
	this.extraCards = []; 						//吃碰杠牌的列表
	this.handCardsNum = 0; 						//手牌张数
	this.tingList = []; 						//听牌列表
};

var pro = UserData.prototype;

//导出前端的userData
pro.exportClientData = function () {
	var data = {};

	//玩家信息
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
}

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
}

module.exports = UserData;