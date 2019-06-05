module.exports = {
	//客户端请求服务端协议
	LOGIN: 20000, 									//登录
	REQUEST_USER_INFO: 20001, 						//获取玩家信息
	ENTER_GROUP_LEVEL: 20002, 						//加入场次
	GET_CREATE_FRIEND_ROOM_CONFIG: 20003,			//获取创建房间配置
	CREATE_FRIEND_ROOM: 20004, 						//创建房间
	ENTER_FRIEND_ROOM: 20005, 						//进入好友房
	CHECK_IN_GAME: 20006, 							//检测是否在游戏中

	RELOAD_GAME: 20100, 							//断线重连
	ENTER_ROOM: 20101, 								//进入房间
	USER_LEAVE: 20102, 								//玩家离开房间
	USER_READY: 20103, 								//玩家准备
	OPE_REQ: 20104, 								//玩家操作

	//服务端返回给客户端协议
	REC_INFO: 20200, 								//断线重连消息
	ROOM_INFO: 20201,								//房间信息
	UPDATE_USER_LIST: 20202, 						//刷新玩家列表
	ROUND_INFO: 20203,								//回合消息
	RESULT_INFO: 20204, 							//结算消息
	WAIT_USER_READY: 20205, 						//等待玩家准备
	USER_KICK: 20206, 								//玩家被踢出
	GAME_START: 20207, 								//游戏开始
	OPE_RSP: 20208, 								//玩家操作返回
}