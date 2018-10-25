var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

module.exports = function(app) {
	return new UserRemote(app);
};

var UserRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

/**
 * Add user into game channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
UserRemote.prototype.add = function(uid, sid, name, flag, cb) {
	var channel = this.channelService.getChannel(name, flag);
	var username = uid.split('*')[0];
	var param = {
		route: 'onAdd',
		user: username
	};
	channel.pushMessage(param);

	if( !! channel) {
		channel.add(uid, sid);
	}

	cb(this.get(name, flag));
};


/**
 * User login.
 *
 * @param {String} uid unique id for user
 *
 */
UserRemote.prototype.login = function(udid, cb) {
	//根据udid查找玩家账号
	var sql = "SELECT * FROM user_info WHERE udid = ? ;";
	pomelo.app.get('dbclient').query(sql, [udid], function(err, res) {
		if (err) {
			cb(err);
		} else {
			if (res.length === 0) { 							//没有该玩家，创建玩家
 				var newUserInfo = createNewUser(udid);
 				cb(err, newUserInfo);
			} else { 											//找到玩家信息，返回
				cb(err, res)
			}
		}
	})
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