module.exports = {
	ROOM_SERVICE: {
		ROOM_NUM: 100,
	},

	ROOM: {
		STATE: {
			UN_INITED: 0, 						//房间未初始化
			INITED: 1, 							//初始化完成
			READY: 2, 							//人全部到齐，等待开局
			PLAYING: 3, 						//开局中
			ROUND_END: 4, 						//第一局结束，第二局还没开始
		},
	},
};