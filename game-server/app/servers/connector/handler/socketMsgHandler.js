var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var SocketCmd = require('../../../models/socketCmd');
var GameConfig = require('../../../models/gameConfig');
var utils = require('../../../util/utils');
var Code = require('../../../../../shared/code');
var redisUtil = require("../../../util/redisUtil");

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
	this.initSocketCmdConfig();
};

var handler = Handler.prototype;

//客户端发送的socket消息
handler.socketMsg = function(msg, session, next) {
	var self = this;
	if (! self.socketCmdConfig) {
		self.initSocketCmdConfig();
	}

	logger.info("收到客户端发送的消息, ");
	utils.printObj();

	var msgSocketCmd = msg.socketCmd;
	var processerFun = self.socketCmdConfig[msgSocketCmd];
	if (!! processerFun) {
		processerFun.call(self, msg, session, next);
	} else {
		logger.error('没有找到处理函数, cmd = ' + msgSocketCmd);

		next(null, {
			code: Code.NO_HANDLER,
			msg: "没有找到处理函数"
		})
	}
};

////////////////////////////处理函数begin////////////////////////////
//登录
var login = function(msg, session, next) {
	var self = this;
	var sessionService = self.app.get('sessionService');
	self.app.rpc.auth.authRemote.login(session, msg.udid, self.app.get('serverId'), function (err, res) {
		if (err) {
			logger.error('login error ' + err.stack);
			next(err);
		} else {
			//该mid已经登录了，将第一次登录的人踢出
			var oldSession = sessionService.getByUid(res.mid)
			if( !! oldSession) {
				sessionService.kick(res.mid, "您的账号在其他地方登录");
			}

			session.bind(res.mid);
			session.on('closed', userOffline.bind(null, self.app));
			next(null, {
				code: Code.OK,
				userData: res,
				gameList: GameConfig.gameList
			});
		}
	});
};

//拉取个人信息
var requestUserInfo = function (msg, session, next) {

};

//请求加入场次
var enterGroupLevel = function (msg, session, next) {
	var self = this;
	var mid = session.uid;
	var level = msg.level.toString();
	var gameID = parseInt(level.substr(0, 1));
	var serverType = GameConfig.groupServerList[gameID];

	//检查当前是否在匹配中或者游戏中
	redisUtil.getUserDataByField(mid, ["state"], function (err, resp) {
		if (err) {
			next(err);
		} else {
			if (resp[0] > 0) {
				//如果当前玩家已经在匹配中，不再处理
				logger.info('玩家正在匹配或者已经在房间中，不做处理 mid = ', mid, resp[0]);
				next(null);
			} else {
				//修改redis中玩家状态
				redisUtil.requestEnterGroupLevel(mid);

				//玩家在大厅，进入游戏服务器进行匹配
				self.app.rpc[serverType].roomRemote.socketMsg(session, mid, msg, function (err, res) {
					if (err || (res && res.code !== Code.OK)) {
						redisUtil.leaveRoom(mid);
					}

					next(err, res);
				});
			}
		}
	});
};

var commonRoomMsg = function (msg, session, next) {
	var self = this;
	var mid = session.uid;

	logger.info("收到玩家 " + mid + " 的房间消息, cmd = " + msg.socketCmd);

	//从redis中拿该用户的游戏服务器，进行消息转发
	redisUtil.getUserDataByField(mid, ["gameServerType", "gameServerID"], function (err, resp) {
		if (err) {
			next(err);
		} else {
			if (resp[0] !== "" && resp[1] !== "") {
				logger.info("玩家 " + mid + " 所在的游戏服务器类型为 " + resp[0] + ", ID为 " + resp[1]);

				//转发消息
				self.app.rpc[resp[0]].roomRemote.socketMsg.toServer(resp[1], mid, msg, function (err) {
					next(err, {code: Code.OK});
				});
			} else {
				logger.info("没有找到玩家 " + mid + " 所在的游戏服务器类型或者服务器ID，直接返回成功忽略掉该消息");
				next(null, {code: Code.OK});
			}
		}
	});
};
////////////////////////////处理函数end////////////////////////////

//用户离线
var userOffline = function (app, session) {
	console.log("BBBBBBBBBBBBBBBBB 用户离线, mid = " + session.uid);
	if(!session || !session.uid) {
		return;
	}

	app.rpc.auth.authRemote.userOffline(session, session.uid, app.get('serverId'), null);
};

handler.initSocketCmdConfig = function() {
	var self = this;

	self.socketCmdConfig = {
		[SocketCmd.LOGIN]: login,
		[SocketCmd.REQUEST_USER_INFO]: requestUserInfo,
		[SocketCmd.ENTER_GROUP_LEVEL]: enterGroupLevel,
		[SocketCmd.USER_LEAVE]: commonRoomMsg,
		[SocketCmd.USER_READY]: commonRoomMsg,
	};
};