var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var socketCmd = require('../../../models/socketCmd')
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

	utils._debug(msg)

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
}

////////////////////////////处理函数begin////////////////////////////
var login = function(msg, session, next) {
	var self = this;
	var sessionService = self.app.get('sessionService');
	self.app.rpc.user.userRemote.login(session, msg.udid, function (err, res) {
		if (err) {
			logger.error('login error ' + err.stack);
		} else {
			//该mid已经登录了，将第一次登录的人踢出
			var oldSession = sessionService.getByUid(msg.mid)
			if( !! oldSession) {
				sessionService.kick(msg.mid, "您的账号在其他地方登录");
			}

			session.bind(msg.mid);
			next(null, {
				code: 200,
				userData: res
			});
		}
	});
}
////////////////////////////处理函数end////////////////////////////


handler.initSocketCmdConfig = function() {
	var self = this;

	self.socketCmdConfig = {
		[socketCmd.LOGIN]: login
	};
}