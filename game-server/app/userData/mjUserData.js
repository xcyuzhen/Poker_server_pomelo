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
	this.pengCards = []; 						//碰牌列表
	this.gangCards = []; 						//杠牌列表
	this.anGangCards = []; 						//暗杠列表
	this.buGangCards = []; 						//补杠列表
	this.handCardsNum = 0; 						//手牌张数
	this.tingList = []; 						//听牌列表
};

var pro = UserData.prototype;

module.exports = UserData;