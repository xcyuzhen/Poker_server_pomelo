var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var redis = require('redis');

module.exports = function(app) {
	return new UserRemote(app);
};

var UserRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

/**
 * User login.
 *
 * @param {String} uid unique id for user
 * @param {String} sid serverID
 * @param {String} uid unique id for user
 *
 */
UserRemote.prototype.login = function(udid, sid, cb) {
	//根据udid查找玩家账号
	var sql = "SELECT * FROM user_info WHERE udid = ? ;";
	pomelo.app.get('dbclient').query(sql, [udid], function(err, res) {
		if (err) {
			cb(err);
		} else {
			var resultUserData;
			if (res.length === 0) { 							//没有该玩家，创建玩家
 				resultUserData = createNewUser(udid);
			} else {
				resultUserData = res[0];
			}

			//将该玩家添加到大厅channel中
			var channel = this.channelService.getChannel("Hall", true);
			channel.add(resultUserData.mid, sid);

			//将用户常用信息写入redis

			cb(null, resultUserData);
		}
	}.bind(this))
};

UserRemote.prototype.userOffLine = function (mid, sid, cb) {
	var channel = this.channelService.getChannel("Hall", true);
	channel.leave(mid, sid);

	//修改redis中该用户的在线状态

	cb();
};

var createNewUser = function (udid) {
	var sql = "INSERT INTO user_info (udid, appid) VALUES (?, ?) ;";
	pomelo.app.get('dbclient').query(sql, [udid, udid], function(err, res) {
		if (err) {
			logger.error('createNewUser error ' + err.stack);
		} else {
			//更改默认昵称
			var mid = res.insertId;
			var nick = "游客" + mid;

			sql = "UPDATE user_info SET nick = ? WHERE mid = ?";
			pomelo.app.get('dbclient').query(sql, [nick, mid], function(err, res) {
				if (err) {
					logger.error('update nick error ' + err.stack);
				} else {
					sql = "SELECT * FROM user_info WHERE mid = ? ;";
					pomelo.app.get('dbclient').query(sql, [mid], function(err, res) {
						if (err) {
							logger.error('get new user error ' + err.stack);
						} else {
							return res[0];
						}
					})
				}
			})
		}
	})
};