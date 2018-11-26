var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var socketCmd = require('../../../models/socketCmd')
var gameConfig = require('../../../models/gameConfig')
var utils = require('../../../../util/utils')
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

	var msgSocketCmd = msg.socketCmd;
	var processerFun = self.socketCmdConfig[msgSocketCmd]
	if (!! processerFun) {
		processerFun.call(self, msg, session, next);
	} else {
		logger.error('没有找到处理函数, cmd = ' + msgSocketCmd);

		next(null, {
			code: 201,
			msg: "没有找到处理函数"
		})
	}
};

////////////////////////////处理函数begin////////////////////////////
//登录
var login = function(msg, session, next) {
	var self = this;
	var sessionService = self.app.get('sessionService');
	self.app.rpc.user.userRemote.login(session, msg.udid, self.app.get('serverId'), function (err, res) {
		if (err) {
			logger.error('login error ' + err.stack);
		} else {
			//该mid已经登录了，将第一次登录的人踢出
			var oldSession = sessionService.getByUid(msg.mid)
			if( !! oldSession) {
				sessionService.kick(msg.mid, "您的账号在其他地方登录");
			}

			session.bind(res.mid);
			session.on('closed', userOffLine.bind(null, self.app));
			next(null, {
				code: 200,
				userData: res,
				gameList: gameConfig.gameList
			});
		}
	});
};

//请求加入场次
var enterGroupLevel = function (msg, session, next) {
	var level = msg.level;
	var serverType = eval(gameConfig.groupServerList[level]);
};

//拉取个人信息
var requestUserInfo = function (msg, session, next) {

};
////////////////////////////处理函数end////////////////////////////

//用户离线
var userOffLine = function (app, session) {
	console.log("BBBBBBBBBBBBBBBBB 用户离线, mid = " + session.uid);
	if(!session || !session.uid) {
		return;
	}

	app.rpc.user.userRemote.userOffLine(session, session.uid, app.get('serverId'), null);

	//如果该用户在游戏房间中，通知其他人，该玩家离线
};

handler.initSocketCmdConfig = function() {
	var self = this;

	self.socketCmdConfig = {
		[socketCmd.LOGIN]: login,
		[socketCmd.REQUEST_USER_INFO]: requestUserInfo,
		[socketCmd.ENTER_GROUP_LEVEL]: enterGroupLevel,
	};
};