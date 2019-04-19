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
	this.roomState = Consts.ROOM.STATE.UN_INITED;					//当前房间状态
	this.userList = {}; 											//玩家列表
	this.seatMidMap = {}; 											//座位号和mid的映射表
	this.channel = null; 											//channel
	this.roomConfig = null; 										//房间配置

	this.timeoutID = null; 											//房间延时ID
	this.intervalID = null; 										//循环计时ID
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
	this.level = level;
	this.roomNum = roomNum;
	this.maxPlayerNum = 4;
	this.curPlayerNum = 0;
	this.realPlayerNum = 0;

	//初始化牌局数据
	//服务端自用
	this.cardList = []; 											//牌列表
	this.zhuangSeatID = 0; 											//庄家座位号
	this.curTurnSeatID = 0; 										//当前摸牌打牌操作座位号
	this.opeCheckList = []; 										//请求验证列表
	//前后端共用
	this.gameState = MjConsts.GAME_STATE.INIT; 						//当前游戏状态
	this.zhuangMid = 0; 											//庄家mid
	this.leftTime = 0; 												//当前操作倒计时
	this.curOpeMid = 0; 											//当前可操作玩家mid
	this.curOpeList = []; 											//当前可操作列表
	this.lastOpeMid = 0; 											//上次操作玩家mid
	this.lastOpeItem = null; 										//上次操作数据

	//结算数据
	this.huMid = 0; 												//胡牌玩家mid
	this.roundEndTime = "";											//结束时间字符串

	//初始化channel
	this.channel = this.channelService.getChannel(roomNum, true);

	//修改房间状态
	this.roomState = Consts.ROOM.STATE.INITED;
};

//通用房间消息处理函数
pro.commonRoomMsgHandler = function (mid, msg, cb) {
	var self = this;

	var msgSocketCmd = msg.socketCmd;
	var processerFun = socketCmdConfig[msgSocketCmd];
	if (!! processerFun && self[processerFun]) {
		self[processerFun](mid, msg, cb);
	} else {
		logger.error('没有找到处理函数, cmd = ' + msgSocketCmd);
		utils.invokeCallback(cb, {message: "没有找到处理函数"});
	}
};

//广播消息
pro.broadCastMsg = function (param) {
	var self = this;

	var midList = [];
	for (var tMid in self.userList) {
		midList.push(tMid);
	}

	self.pushMessageByUids(midList, param);
};

//推送消息
pro.pushMessageByUids = function (midList, param) {
	var self = this;

	midList = midList || [];
	var realUserMemList = [];

	for (var i = midList.length - 1; i >= 0; i--) {
		var mid = midList[i];
		var userItem = self.userList[mid];

		if (userItem.robot == 0) {
			realUserMemList.push(self.channel.getMember(mid));
		} else {
			userItem.onSocketMsg(param);
		}
	}

	if (realUserMemList.length > 0) {
		self.channelService.pushMessageByUids("onSocketMsg", param, realUserMemList, {}, function (err) {
			if (err) {
				logger.error("消息推送失败，err = " + err);
			}
		});
	}
};

//刷新所有玩家信息
pro.updateUserSeatList = function () {
	var self = this;

	if (self.curPlayerNum <= 0) {
		logger.error("mjRoom.updateUserSeatList 房间已经没有人");
		return;
	}

	var clientUserList = {};
	for (var tMid in self.userList) {
		var tUserItem = self.userList[tMid];
		clientUserList[tMid] = tUserItem.exportClientData();
	}

	var param = {
		groupName: MjConsts.MSG_GROUP_NAME,
		res: {
			socketCmd: SocketCmd.UPDATE_USER_LIST,
			userList: clientUserList,
			roomState: self.roomState,
		},
	};
	self.broadCastMsg(param);
};

//广播回合消息
pro.broadcastRoundInfo = function () {
	var self = this;

	//给每个玩家发送回合消息，每个玩家只能看到自己的手牌
	for (var tMid in self.userList) {
		var gameUserList = {};
		for (var gMid in self.userList) {
			var tUserItem = self.userList[gMid];
			gameUserList[gMid] = tUserItem.exportClientGameData(tMid);
		}

		var param = {
			groupName: MjConsts.MSG_GROUP_NAME,
			res: {
				socketCmd: SocketCmd.ROUND_INFO,
				roomState: self.roomState,
				gameState: self.gameState,
				leftTime: self.leftTime,
				leftCardsNum: self.cardList.length - MjConsts.MA_NUM,
				curOpeMid: self.curOpeMid,
				curOpeList: utils.clone(self.curOpeList),
				lastOpeMid: self.lastOpeMid,
				lastOpeItem: utils.clone(self.lastOpeItem),
				userList: gameUserList,
			},
		};

		self.pushMessageByUids([tMid], param);
	}
};

//向玩家列表中的玩家发送回合消息
pro.pushRoundInfoByMids = function (midList) {
	var self = this;

	midList = midList || [];
	if (midList.length <= 0) {
		return;
	}

	for (var i = 0; i < midList.length; i++) {
		var mid = midList[i];
		var gameUserList = {};
		for (var gMid in self.userList) {
			var tUserItem = self.userList[gMid];
			gameUserList[gMid] = tUserItem.exportClientGameData(mid);
		}

		var param = {
			groupName: MjConsts.MSG_GROUP_NAME,
			res: {
				socketCmd: SocketCmd.ROUND_INFO,
				roomState: self.roomState,
				gameState: self.gameState,
				leftTime: self.leftTime,
				leftCardsNum: self.cardList.length - MjConsts.MA_NUM,
				curOpeMid: self.curOpeMid,
				curOpeList: utils.clone(self.curOpeList),
				lastOpeMid: self.lastOpeMid,
				lastOpeItem: utils.clone(self.lastOpeItem),
				userList: gameUserList,
			},
		};

		self.pushMessageByUids([mid], param);
	}
};

/////////////////////////////////////对外接口begin/////////////////////////////////////
//玩家进入房间
pro.enterRoom = function (mid, isRobot) {
	console.log("玩家进入房间 mid = ");
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
					self.seatMidMap[userItem.seatID] = mid;

					if (!isRobot) {
						//将玩家添加进channel
						self.channel.add(mid, userDataAll.sid);
					}

					//组装发给客户端的userList
					var userSeatList = {};
					//已经在房间的玩家
					var otherMidList = [];
					//当前玩家人数
					var curPlayerNum = 0;
					//真实玩家人数
					var realPlayerNum = 0;
					for (var tMid in self.userList) {
						var tUserItem = self.userList[tMid];
						userSeatList[tMid] = tUserItem.exportClientData();

						if (tMid !== mid) {
							otherMidList.push(tMid);
						}

						curPlayerNum++;

						if (tUserItem.robot == 0) {
							realPlayerNum++;
						}
					}

					//记录当前玩家人数
					self.curPlayerNum = curPlayerNum;

					//记录真实玩家人数
					self.realPlayerNum = realPlayerNum;

					//将房间全部信息发给刚进入的玩家
					var param = {
						groupName: MjConsts.MSG_GROUP_NAME,
						res: {
							socketCmd: SocketCmd.ENTER_ROOM,
							roomData: self.exportRoomData(),
							roomState: self.roomState,
							userList: userSeatList,
						},
					};
					self.pushMessageByUids([mid], param);

					//通知其他玩家有新玩家加入
					if (otherMidList.length > 0) {
						var param = {
							groupName: MjConsts.MSG_GROUP_NAME,
							res: {
								socketCmd: SocketCmd.UPDATE_USER_LIST,
								userList: userSeatList,
							},
						};
						self.pushMessageByUids(otherMidList, param);
					}

					//判断房间是否已满
					var isFull = self.isRoomFull();
					if (isFull) {
						// self.waitToStart();
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

	// if (self.roomState == Consts.ROOM.STATE.PLAYING) {
	// 	utils.invokeCallback(cb, null, {
	// 		code: Code.ROOM.GAME_PLAYING,
	// 		msg: "牌局进行中无法退出房间",
	// 	});
	// 	return;
	// }

	redisUtil.getUserDataByField(mid, ["sid"], function(err, resp) {
		if (err) {
			logger.error("mjRoom.leaveRoom 获取玩家sid失败");
		} else {
			self.roomState = Consts.ROOM.STATE.INITED;

			var isRobot = userItem.robot == 1;

			if (!isRobot) {
				//将该玩家从channel中踢出
				self.channel.leave(mid, resp[0]);
			}

			//清理
			userItem.clean();

			//删除座位mid映射数据
			delete(self.seatMidMap[userItem.seatID]);

			//删除该玩家数据
			delete(self.userList[mid]);

			//修改redis中的数据
			redisUtil.leaveRoom(mid);

			//记录当前玩家人数
			self.curPlayerNum--;

			//记录真实玩家人数
			if (!isRobot) {
				self.realPlayerNum--;
			}

			//通知robotMgr回收机器人
			if (isRobot) {
				self.app.rpc.auth.robotRemote.returnOneRobot({}, mid, null);
			}

			//如果该房间所有玩家都已经离开，回收该房间
			console.log("房间剩余人数 playerNum = ", self.curPlayerNum);
			if (self.curPlayerNum == 0) {
				self.clearRoom();
				self.roomMgrService.recycleRoom(self.roomIndex);
			} else {
				//刷新玩家列表
				self.updateUserSeatList();

				//如果还有真实玩家，启动请求机器人定时器
				if (self.realPlayerNum > 0) {
					self.startReqRobotTimer();
				}
			}

			utils.invokeCallback(cb, null, {
				code: Code.OK,
			});
		}
	});
};

//玩家上线
pro.userOnline = function (mid) {
	var self = this;

	var userItem = self.userList[mid];
	userItem.online = 1;

	//广播该玩家上线的消息
	self.updateUserSeatList();
};

//玩家掉线
pro.userOffline = function (mid) {
	var self = this;

	// if (self.roomState == Consts.ROOM.STATE.PLAYING) {
	// 	//玩家在游戏中，修改该玩家的在线状态
	// 	var userItem = self.userList[mid];
	// 	userItem.online = 0;

	// 	//广播该玩家掉线的消息
	// 	self.updateUserSeatList();
	// } else {
		self.leaveRoom(mid);
	// }
};

//房间是否已经初始化
pro.isRoomInited = function () {
	return this.inited;
};

//房间场次
pro.getGroupLevel = function () {
	return this.level;
};

//房间号
pro.getRoomNumber = function () {
	return this.roomNum;
};

//房间是否已满
pro.isRoomFull = function () {
	return this.curPlayerNum == this.maxPlayerNum;
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
	return this.realPlayerNum;
};
/////////////////////////////////////对外接口end/////////////////////////////////////

/////////////////////////////////////客户端请求处理begin/////////////////////////////////////
//玩家准备
pro.userReady = function (mid, msg, cb) {
	var self = this;

	utils.invokeCallback(cb, null);

	var userItem = self.userList[mid];
	if (!userItem) {
		logger.error("mjRoom.userReady 没有找到玩家 " + mid);
		return;
	}
	userItem.ready = 1;

	self.updateUserSeatList();

	//人数已满
	if (self.curPlayerNum == self.maxPlayerNum) {
		//全部玩家已经准备，游戏开始
		var allReady = true;
		for (var tMid in self.userList) {
			var userItem = self.userList[tMid];
			if (userItem.ready == 0) {
				allReady = false;
				break;
			}
		}

		if (allReady) {
			self.gameStart();
		}
	}
};

//玩家请求操作
pro.userOpeRequest = function (mid, msg, cb) {
	var self = this;

	console.log("AAAAAAAAAAAAAA 收到玩家请求 ", mid, msg.opeType, msg.opeData);
	console.log("AAAAAAAAAAAAAA 当前游戏状态 ", self.gameState);

	//当前牌局已经结束，直接返回
	if (self.gameState != MjConsts.GAME_STATE.DA_PAI) {
		utils.invokeCallback(cb, null);
		return;
	}

	var opeType = msg.opeType;
	var opeData = msg.opeData;

	//验证操作是否合法
	var opeLegal = false;
	if (self.curOpeMid == mid) {
		for (var i = self.opeCheckList.length - 1; i >= 0; i--) {
			var checkItem = self.opeCheckList[i];
			if (opeType == checkItem.opeType) {
				if (checkItem.opeData) {
					if (checkItem.opeData == opeData) {
						opeLegal = true;
						break;
					}
				} else {
					opeLegal = true;
					break;
				}
			}
		}
	}

	console.log("AAAAAAAAAAAAAA 操作合法性 ", opeLegal);

	if (opeLegal) {
		//操作合法

		//广播操作成功("过"操作不广播)
		if (opeType != MjConsts.OPE_TYPE.GUO) {
			self.stopGameTimer();

			//玩家自己出牌成功不通知他自己
			var broadMsgMidList = self.getMidListExcept();
			if (!!cb && opeType == MjConsts.OPE_TYPE.OUT_CARD) {
				broadMsgMidList = self.getMidListExcept([mid]);
			}

			var param = {
				groupName: MjConsts.MSG_GROUP_NAME,
				res: {
					socketCmd: SocketCmd.OPE_RSP,
					code: Code.OK,
					opeMid: mid,
					opeType: opeType,
					opeData: opeData,
				},
			};
			self.pushMessageByUids(broadMsgMidList, param);

			self.lastOpeMid = mid;
			self.lastOpeItem = {opeType: opeType, opeData: opeData};
		}

		var opeUserItem = self.userList[mid];
		switch (opeType) {
			case MjConsts.OPE_TYPE.GUO:
				var curOutCardMid = self.seatMidMap[self.curTurnSeatID];
				if (curOutCardMid == mid) {
					//当前出牌人和操作人是同一人
					//清除检测列表中除了打牌的检测
					for (var i = self.opeCheckList.length - 1; i >= 0; i--) {
						var checkItem = self.opeCheckList[i];
						if (checkItem.opeType != MjConsts.OPE_TYPE.OUT_CARD) {
							self.opeCheckList.splice(i, 1);
						}
					}

					//清空当前操作列表
					self.curOpeList = [];
				} else {
					//当前操作人和出牌人不是同一人
					self.curTurnSeatID++;
					if (self.curTurnSeatID > self.maxPlayerNum) {
						self.curTurnSeatID = 1;
					}

					self.stopGameTimer();
					self.dragOneCard();
				}

				break;
			case MjConsts.OPE_TYPE.PENG:
				//找到出牌人
				var outCardMid = self.seatMidMap[self.curTurnSeatID];
				var outCardUserItem = self.userList[outCardMid];

				//删除出牌人出的最后一张牌
				outCardUserItem.outCards.splice(-1, 1);

				//删除碰牌人手牌中对应的两张手牌
				var delCount = 0;
				for (var i = opeUserItem.handCards.length - 1; i >= 0; i--) {
					if (opeUserItem.handCards[i] == opeData) {
						opeUserItem.handCards.splice(i, 1);
						delCount ++;
						if (delCount == 2) {
							break;
						}
					}
				}

				//插入到碰牌人的吃碰杠列表
				opeUserItem.extraCards.push({opeType: opeType, cardValue: opeData, targetMid: outCardMid});

				//轮到碰牌人出牌
				self.curTurnSeatID = opeUserItem.seatID;
				self.curOpeMid = opeUserItem.mid;
				self.curOpeList = [];
				self.leftTime = MjConsts.TIME_CONF.OutCardLeftTime;

				//检测列表
				self.opeCheckList = [];
				self.opeCheckList.push({opeType: MjConsts.OPE_TYPE.OUT_CARD});

				//广播回合消息
				self.broadcastRoundInfo();

				break;
			case MjConsts.OPE_TYPE.GANG:
				//找到出牌人
				var outCardMid = self.seatMidMap[self.curTurnSeatID];
				var outCardUserItem = self.userList[outCardMid];

				//删除出牌人出的最后一张牌
				outCardUserItem.outCards.splice(-1, 1);

				//删除杠牌人手牌中对应的三张手牌
				var delCount = 0;
				for (var i = opeUserItem.handCards.length - 1; i >= 0; i--) {
					if (opeUserItem.handCards[i] == opeData) {
						opeUserItem.handCards.splice(i, 1);
						delCount ++;
						if (delCount == 3) {
							break;
						}
					}
				}

				//插入到杠牌人的吃碰杠列表
				opeUserItem.extraCards.push({opeType: opeType, cardValue: opeData, targetMid: outCardMid});

				//计分
				//杠牌玩家计分
				var rateType = MjConsts.RATE_TYPE.GANG;
				var rateValue = MjConsts.RATE_CONF[rateType] * (self.maxPlayerNum - 1);
				opeUserItem.addRateItem({rateType: rateType, rateValue: rateValue});
				//被杠玩家计分
				rateType = MjConsts.RATE_TYPE.FANG_GANG;
				rateValue = MjConsts.RATE_CONF[rateType] * (self.maxPlayerNum - 1);
				outCardUserItem.addRateItem({rateType: rateType, rateValue: rateValue});

				//变更出牌人
				self.curTurnSeatID = opeUserItem.seatID;

				//抓牌
				self.dragOneCard();

				break;
			case MjConsts.OPE_TYPE.AN_GANG:
			case MjConsts.OPE_TYPE.BU_GANG:
				//计分类型
				var opeRateType, outCardRateType;

				if (opeType == MjConsts.OPE_TYPE.AN_GANG) {
					//删除杠牌人手牌中对应的四张手牌
					var delCount = 0;
					for (var i = opeUserItem.handCards.length - 1; i >= 0; i--) {
						if (opeUserItem.handCards[i] == opeData) {
							opeUserItem.handCards.splice(i, 1);
							delCount ++;
							if (delCount == 4) {
								break;
							}
						}
					}

					opeRateType = MjConsts.RATE_TYPE.AN_GANG;
					outCardRateType = MjConsts.RATE_TYPE.BEI_AN_GANG;
				} else if (opeType == MjConsts.OPE_TYPE.BU_GANG) {
					//删除杠牌人手牌中对应的一张手牌
					for (var i = opeUserItem.handCards.length - 1; i >= 0; i--) {
						if (opeUserItem.handCards[i] == opeData) {
							opeUserItem.handCards.splice(i, 1);
							break;
						}
					}

					//删除碰牌
					for (var i = opeUserItem.extraCards.length - 1; i >= 0; i--) {
						var extraItem = opeUserItem.extraCards[i];
						if (extraItem.opeType == MjConsts.OPE_TYPE.PENG && extraItem.opeData == opeData) {
							opeUserItem.extraCards.splice(i, 1);
							break;
						}
					}

					opeRateType = MjConsts.RATE_TYPE.BU_GANG;
					outCardRateType = MjConsts.RATE_TYPE.BEI_BU_GANG;
				}

				//插入到杠牌人的吃碰杠列表
				opeUserItem.extraCards.push({opeType: opeType, cardValue: opeData, targetMid: opeUserItem.mid});

				//计分
				//杠牌玩家计分
				var rateValue = MjConsts.RATE_CONF[opeRateType] * (self.maxPlayerNum - 1);
				opeUserItem.addRateItem({rateType: opeRateType, rateValue: rateValue});
				//被杠玩家计分
				rateValue = MjConsts.RATE_CONF[outCardRateType];
				for (var tMid in self.userList) {
					if (tMid != mid) {
						self.userList[tMid].addRateItem({rateType: outCardRateType, rateValue: rateValue});
					}
				}

				//变更出牌人
				self.curTurnSeatID = opeUserItem.seatID;

				//抓牌
				self.dragOneCard();
				break;
			case MjConsts.OPE_TYPE.HU:
				//计分
				//胡牌玩家计分
				var rateType = MjConsts.RATE_TYPE.HU;
				var rateValue = MjConsts.RATE_CONF[rateType] * (self.maxPlayerNum - 1);
				opeUserItem.addRateItem({rateType: rateType, rateValue: rateValue});
				//被胡牌玩家计分
				rateType = MjConsts.RATE_TYPE.BEI_HU;
				rateValue = MjConsts.RATE_CONF[rateType];
				for (var tMid in self.userList) {
					if (tMid != mid) {
						self.userList[tMid].addRateItem({rateType: rateType, rateValue: rateValue});
					}
				}

				self.roundResult(mid, opeData);
				break;
			case MjConsts.OPE_TYPE.OUT_CARD:
				//删除出牌人手牌中对应的牌
				for (var i = opeUserItem.handCards.length - 1; i >= 0; i--) {
					if (opeUserItem.handCards[i] == opeData) {
						opeUserItem.handCards.splice(i, 1);
						break;
					}
				}

				//添加出牌人出的牌
				opeUserItem.outCards.push(opeData);

				//没有牌了，流局
				if (self.cardList.length <= MjConsts.MA_NUM) {
					self.roundResult();
				} else {
					//检测除了出牌人，其他人能不能碰或杠
					var foundOpeMid = false
					for (var tMid in self.userList) {
						if (tMid != mid) {
							var tUserItem = self.userList[tMid];
							var opeList = self.getUserOpeList(tMid, null, opeData);
							if (opeList.length > 0) {
								foundOpeMid = true;

								//添加检测列表
								self.opeCheckList = [];
								for (var j = 0; j < opeList.length; j++) {
									var opeItem = opeList[j];
									self.opeCheckList.push({opeType: opeItem.opeType, opeData: opeItem.opeData});
								}
								self.opeCheckList.push({opeType: MjConsts.OPE_TYPE.GUO});

								self.leftTime = MjConsts.TIME_CONF.OpeLeftTime;

								//给其他玩家发送回合消息
								self.curOpeMid = 0;
								self.curOpeList = [];
								var otherMidList = self.getMidListExcept([tMid]);
								self.pushRoundInfoByMids(otherMidList);

								//给能碰杠玩家发送回合消息
								self.curOpeMid = tMid;
								self.curOpeList = opeList;
								self.pushRoundInfoByMids([tMid]);

								//开启倒计时
								self.startGameTimer(function () {
									self.userOpeRequest(tMid, {opeType: MjConsts.OPE_TYPE.GUO});
								});

								break;
							}
						}
					}

					//没有可以碰杠的玩家，下一个人抓牌打牌
					if (!foundOpeMid) {
						self.curTurnSeatID++;
						if (self.curTurnSeatID > self.maxPlayerNum) {
							self.curTurnSeatID = 1;
						}
						self.dragOneCard();
					}
				}

				break;
		}
	} else {
		//操作不合法
		//1.出牌不合法，发送给出牌人其吃碰杠牌，手牌和出牌用来刷新界面
		//2.其他操作不合法，不给手牌等数据
		if (!!cb) {
			//有回调，是前端操作
			var opeUserItem = self.userList[mid];
			var param;

			if (opeType == MjConsts.OPE_TYPE.OUT_CARD) {
				param = {
					groupName: MjConsts.MSG_GROUP_NAME,
					res: {
						socketCmd: SocketCmd.OPE_RSP,
						code: Code.FAIL,
						opeType: opeType,
						opeData: opeData,
						msg: "请求超时，操作失败",
						extraCards: utils.clone(opeUserItem.extraCards),
						handCards: utils.clone(opeUserItem.handCards),
						outCards: utils.clone(opeUserItem.outCards),
					},
				};
			} else {
				param = {
					groupName: MjConsts.MSG_GROUP_NAME,
					res: {
						socketCmd: SocketCmd.OPE_RSP,
						code: Code.FAIL,
						opeType: opeType,
						opeData: opeData,
						msg: "请求超时，操作失败",
					},
				};
			}

			self.pushMessageByUids([mid], param);
		}
	}

	utils.invokeCallback(cb, null);
};
/////////////////////////////////////客户端请求处理end/////////////////////////////////////

/////////////////////////////////////牌局流程begin/////////////////////////////////////
//等待开局
pro.waitToStart = function () {
	var self = this;
	logger.info("全部玩家到齐，开始进入准备流程");
	self.roomState = Consts.ROOM.STATE.WAIT_TO_START;
	self.leftTime = MjConsts.TIME_CONF.ReadyLeftTime;

	//广播
	var param = {
		groupName: MjConsts.MSG_GROUP_NAME,
		res: {
			socketCmd: SocketCmd.WAIT_USER_READY,
			roomState: self.roomState,
			leftTime: self.leftTime - 2000,
		},
	};
	self.broadCastMsg(param);

	//开启定时器
	self.startGameTimer(function () {
		var hasUserUnready = false;

		//踢出没有准备的玩家
		for (var tMid in self.userList) {
			var userItem = self.userList[tMid];
			if (userItem.ready == 0) {
				hasUserUnready = true;
				self.leaveRoom(tMid);

				//通知被踢出玩家
				var param = {
					groupName: MjConsts.MSG_GROUP_NAME,
					res: {
						socketCmd: SocketCmd.USER_KICK,
						msg: "准备超时，您已经被踢出房间！",
					},
				};
				self.pushMessageByUids([tMid], param);
			}
		}
	});
};

//游戏开始
pro.gameStart = function () {
	var self = this;

	//确定庄家
	self.zhuangSeatID += 1;
	if (self.zhuangSeatID > self.maxPlayerNum) {
		self.zhuangSeatID -= self.maxPlayerNum;
	}
	self.zhuangMid = self.seatMidMap[self.zhuangSeatID];

	self.roomState = Consts.ROOM.STATE.PLAYING;
	var param = {
		groupName: MjConsts.MSG_GROUP_NAME,
		res: {
			socketCmd: SocketCmd.GAME_START,
			roomState: self.roomState,
			zhuangMid: self.zhuangMid,
		},
	};
	self.broadCastMsg(param);

	//洗牌
	self.shuffle();

	//延时开始发牌
	self.startTimeoutTimer(function () {
		self.clearTimeoutTimer();
		self.faPai();
	}, MjConsts.TIME_CONF.GameStartAnimTime);
};

//发牌
pro.faPai = function () {
	var self = this;
	var cardsNum = 13;

	for (var seatID = 1; seatID <= self.maxPlayerNum; seatID ++) {
		var tMid = self.seatMidMap[seatID];
		var userItem = self.userList[tMid];
		var cardList = self.cardList.splice(-cardsNum, cardsNum);
		userItem.handCards = cardList;
	}

	self.gameState = MjConsts.GAME_STATE.FA_PAI;

	//广播发牌信息
	self.broadcastRoundInfo();

	//延时开始打牌
	self.startTimeoutTimer(function () {
		self.clearTimeoutTimer();

		self.gameState = MjConsts.GAME_STATE.DA_PAI;
		self.curTurnSeatID = self.zhuangSeatID;

		self.dragOneCard();
	}, MjConsts.TIME_CONF.FaPaiAnimTime);
};

//抓一张牌
pro.dragOneCard = function () {
	var self = this;

	//清空操作检测列表
	self.curOpeList = [];
	self.opeCheckList = [];

	//当前出牌人抓一张牌
	var dragCard = self.cardList.splice(-1, 1)[0];
	var curOutCardMid = self.seatMidMap[self.curTurnSeatID];
	var curOutCardUserItem = self.userList[curOutCardMid];
	curOutCardUserItem.handCards.push(dragCard);
	self.curOpeMid = curOutCardMid;
	self.leftTime = MjConsts.TIME_CONF.OutCardLeftTime;

	//将打牌操作塞进检测列表
	self.opeCheckList.push({opeType: MjConsts.OPE_TYPE.OUT_CARD});

	//检测操作
	var opeList = self.getUserOpeList(curOutCardMid, dragCard);
	//根据操作列表，填充检测列表
	for (var i = 0; i < opeList.length; i++) {
		var opeItem = opeList[i];
		self.opeCheckList.push({opeType: opeItem.opeType, opeData: opeItem.opeData});
	}

	if (opeList.length > 0) {
		//将"过"操作添加进检测列表
		self.opeCheckList.push({opeType: MjConsts.OPE_TYPE.GUO});

		//其他人推送的消息
		self.curOpeList = [];
		var otherMidList = self.getMidListExcept([curOutCardMid]);
		self.pushRoundInfoByMids(otherMidList);

		//给可操作人推送的消息
		self.curOpeList = opeList;
		self.pushRoundInfoByMids([curOutCardMid]);
	} else {
		//所有玩家推送一样的回合消息
		self.curOpeList = [];
		self.broadcastRoundInfo();
	}

	//开始倒计时
	if (self.gameState == MjConsts.GAME_STATE.DA_PAI) {
		self.startGameTimer(function () {
			curOutCardUserItem.autoOutCard();
		});
	}
};

//牌局结束
pro.roundResult = function (huMid, huCard) {
	var self = this;

	logger.info("牌局结束");

	self.roomState = Consts.ROOM.STATE.ROUND_END;
	self.gameState = MjConsts.GAME_STATE.RESULT;

	var endTime = new Date();
	self.roundEndTime = [endTime.toLocaleDateString(), endTime.toLocaleTimeString()].join(" ");

	var maList;
	if (huMid && huMid > 0) {
		logger.info("有人胡牌");

		//摸马
		maList = [];
		var zhongNum = 0;
		for (var i = 0; i < MjConsts.MA_NUM; i++) {
			var card = self.cardList.splice(-1, 1)[0];
			if (self.isMa(huCard, card)) {
				maList.push({cardValue: card, result: 1});
				zhongNum ++;
			} else {
				maList.push({cardValue: card, result: 0});
			}
		}

		if (zhongNum > 0) {
			//摸马计分
			//胡牌玩家计分
			var huUserItem = self.userList[huMid];
			var rateType = MjConsts.RATE_TYPE.MO_MA;
			var rateValue = MjConsts.RATE_CONF[rateType] * (self.maxPlayerNum - 1) * zhongNum;
			huUserItem.addRateItem({rateType: rateType, rateValue: rateValue});
			//被胡玩家计分
			rateType = MjConsts.RATE_TYPE.BEI_MA;
			rateValue = MjConsts.RATE_CONF[rateType] * zhongNum;
			for (var tMid in self.userList) {
				if (tMid != huMid) {
					self.userList[tMid].addRateItem({rateType: rateType, rateValue: rateValue});
				}
			}
		}
	}

	var resultUserList = {};
	for (var tMid in self.userList) {
		resultUserList[tMid] = self.userList[tMid].exportClientResultData();
	}

	var param = {
		groupName: MjConsts.MSG_GROUP_NAME,
		res: {
			socketCmd: SocketCmd.RESULT_INFO,
			roomState: self.roomState,
			gameState: self.gameState,
			roundEndTime: self.roundEndTime,
			huMid: huMid,
			maList: maList,
			userList: resultUserList,
		},
	};
	self.broadCastMsg(param);

	//清理工作
	self.resetGameData();
	for (var tMid in self.userList) {
		self.userList[tMid].resetGameData();
	}
	self.updateUserSeatList();
};
/////////////////////////////////////牌局流程end/////////////////////////////////////

/////////////////////////////////////功能函数begin/////////////////////////////////////
//洗牌
pro.shuffle = function () {
	var handCardNum = 13;
	var tmpCardList = utils.clone(MjConsts.CARD_LIST);
	this.cardList = [];

	//配牌(1号位置)
	// var preCardList = [0,0,0,1,1,1,2,2,2,3,3,3,4];
	var preCardList = [];

	//抓牌列表(发完牌后的抓牌列表)
	// var dragCardList = [0,4];
	var dragCardList = [];

	//将配牌从牌盒中删除
	for (var i = preCardList.length-1; i >= 0; i--) {
		var delCard = preCardList[i];
		for (var j = tmpCardList.length-1; j >= 0; j--) {
			if (delCard == tmpCardList[j]) {
				tmpCardList.splice(j, 1);
				break;
			}
		}
	}

	//抓牌从牌盒中删除
	for (var i = dragCardList.length-1; i >= 0; i--) {
		var delCard = dragCardList[i];
		for (var j = tmpCardList.length-1; j >= 0; j--) {
			if (delCard == tmpCardList[j]) {
				tmpCardList.splice(j, 1);
				break;
			}
		}
	}

	//剩下的牌打乱顺序
	while (tmpCardList.length > 0) {
		var random = utils.randomNum(0, (tmpCardList.length - 1));
		var card = tmpCardList.splice(random, 1)[0];
		this.cardList.push(card);
	}

	//插入抓牌
	for (var i = dragCardList.length-1; i >= 0; i--) {
		var addCard = dragCardList[i];
		this.cardList.splice((-3*handCardNum), 0, addCard);
	}

	//插入配牌
	for (var i = preCardList.length-1; i >= 0; i--) {
		var addCard = preCardList[i];
		this.cardList.push(addCard);
	}
};

//获取可用的座位号
pro.getAvailableSeatID = function () {
	var seatUse = [];

	//将已经被占用的座位添加列表
	for (var mid in this.userList) {
		var userItem = this.userList[mid];
		seatUse[userItem.seatID] = true;
	}

	for (var i = 1; i <= this.maxPlayerNum; i++) {
		if (!seatUse[i]) {
			return i;
		}
	}
};

//获取除了参数列表中的mid的mid列表
pro.getMidListExcept = function (exceptMidList) {
	exceptMidList = exceptMidList || [];
	var resultMidList = [];
	for (var mid in this.userList) {
		var found = false;
		for (var i = 0; i < exceptMidList.length; i++) {
			if (mid == exceptMidList[i]) {
				found = true;
				break;
			}
		}

		if (!found) {
			resultMidList.push(mid);
		}
	}

	return resultMidList;
};

//获取玩家的操作列表(不包括"过")
pro.getUserOpeList = function (mid, dragCard, otherOutCard) {
	var self = this;

	var userItem = self.userList[mid];

	//检测操作
	var opeList = [];

	//检测是否有碰
	if (otherOutCard >= 0) {
		var canPeng = userItem.checkPeng(otherOutCard);
		if (canPeng) {
			opeList.push({opeType: MjConsts.OPE_TYPE.PENG, opeData: otherOutCard});
		}
	}

	//检测是否有杠
	if (otherOutCard >= 0) {
		var canGang = userItem.checkGang(otherOutCard);
		if (canGang) {
			opeList.push({opeType: MjConsts.OPE_TYPE.GANG, opeData: otherOutCard});
		}
	}

	//检测是否有暗杠
	if (dragCard >= 0) {
		var anGangList = userItem.checkAnGang();
		for (var i = 0; i < anGangList.length; i ++) {
			opeList.push({opeType: MjConsts.OPE_TYPE.AN_GANG, opeData: anGangList[i]});
		}
	}
	//检测是否有补杠
	if (dragCard >= 0) {
		var buGangList = userItem.checkBuGang();
		for (var i = 0; i < buGangList.length; i ++) {
			opeList.push({opeType: MjConsts.OPE_TYPE.BU_GANG, opeData: buGangList[i]});
		}
	}

	//检测是否胡牌
	if (dragCard >= 0) {
		var canHuPai = userItem.checkHuPai();
		if (canHuPai) {
			opeList.push({opeType: MjConsts.OPE_TYPE.HU, opeData: dragCard});
		}
	}

	return opeList;
};

//判读是否是马
pro.isMa = function (huCard, maCard) {
	huCard = huCard % 9;
	maCard = maCard % 9;

	return (Math.abs(maCard - huCard) % 3 == 0);
};

//重置局游戏数据
pro.resetGameData = function () {
	this.cardList = [];
	this.curTurnSeatID = 0;
	this.opeCheckList = [];
	this.zhuangMid = 0;
	this.leftTime = 0;
	this.curOpeMid = 0;
	this.curOpeList = [];
	this.lastOpeMid = 0;
	this.lastOpeItem = null;
	this.huMid = 0;
	this.roundEndTime = "";
};

//导出发送给客户端的roomData
pro.exportRoomData = function () {
	var data = {};

	data.level = this.level;
	data.roomNum = this.roomNum;
	data.maxPlayerNum = this.maxPlayerNum;

	return data;
};

//开始请求机器人定时器
pro.startReqRobotTimer = function () {
	var self = this;

	self.clearTimeoutTimer();
	logger.info("开启timeout定时器，请求机器人进入房间");
	self.startTimeoutTimer(function () {
		var param = {
			minGold: self.roomConfig.limitMin,
			maxGold: self.roomConfig.limitMax,
		};

		self.app.rpc.auth.robotRemote.reqOneRobot({}, param, function (err, resp) {
			if (err) {
				logger.error(err);
			} else {
				if (resp) {
					self.enterRoom(resp, true);
				}
			}
		});
	}, MjConsts.TIME_CONF.ReqRobotTime);
};

//开启延时定时器
pro.startTimeoutTimer = function (func, delayTime) {
	var self = this;
	self.clearTimeoutTimer();
	self.timeoutID = setTimeout(func, delayTime);
};

//停止延时定时器
pro.clearTimeoutTimer = function () {
	if (this.timeoutID) {
		logger.info("清除已有timeout定时器");
		clearTimeout(this.timeoutID);
		this.timeoutID = null;
	}
};

//开始循环定时器
pro.startIntervalTimer = function (func, interval) {
	var self = this;
	self.clearIntervalTimer();
	self.intervalID = setInterval(func, interval);
};

//清除循环定时器
pro.clearIntervalTimer = function () {
	if (this.intervalID) {
		logger.info("清除已有interval定时器");
		clearInterval(this.intervalID);
		this.intervalID = null;
	}
};

//开始游戏计时器
pro.startGameTimer = function (endCallBack) {
	var self = this;
	self.startIntervalTimer(function () {
		self.leftTime -= 1000;
		if (self.leftTime <= 0) {
			self.stopGameTimer();
			self.leftTime = 0;

			if (!!endCallBack) {
				endCallBack();
			}
		}
	}, 1000);
};

//停止游戏计时器
pro.stopGameTimer = function () {
	this.clearIntervalTimer();
};

//清空房间
pro.clearRoom = function () {
	//清理计时器
	this.clearTimeoutTimer();
	this.clearIntervalTimer();

	//销毁channel
	this.channelService.destroyChannel(this.roomNum);

	//清空数据
	this.roomConfig = null;
	this.channel = null;
	this.userList = {};
	
	//还原房间状态
	this.roomState = Consts.ROOM.STATE.UN_INITED;
};
/////////////////////////////////////功能函数end/////////////////////////////////////

var socketCmdConfig = {
	[SocketCmd.USER_READY]: "userReady",
	[SocketCmd.OPE_REQ]: "userOpeRequest",
};

module.exports = Room;