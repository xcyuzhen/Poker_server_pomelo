module.exports = {
	LOGIN: 20000, 									//登录
	REQUEST_USER_INFO: 20001, 						//获取玩家信息
	ENTER_GROUP_LEVEL: 20002, 						//加入场次

	ENTER_ROOM: 20100, 								//进入房间
	USER_ENTER: 20101, 								//有玩家进入
	USER_LEAVE: 20102, 								//玩家离开房间
	UPDATE_USER_LIST: 20103, 						//刷新玩家列表
	WAIT_USER_READY: 20104, 						//等待玩家准备
	USER_READY: 20105, 								//玩家准备
	USER_KICK: 20106, 								//玩家被踢出
	GAME_START: 20107, 								//游戏开始
	FA_PAI: 20108, 									//发牌
}