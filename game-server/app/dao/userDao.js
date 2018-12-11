var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var User = require('../domain/user');
var consts = require('../consts/consts');
var utils = require('../util/utils');

var userDao = module.exports;

userDao.getUserByUdid = function (udid, cb) {
	//根据udid查找玩家账号
	var sql = "SELECT * FROM user_info WHERE udid = ? ;";
	var param = [udid];
	pomelo.app.get('dbclient').query(sql, param, function (err, res) {
		if (err !== null) {
			logger.error('get user failed! ' + err.message);
			utils.invokeCallback(cb, err, null);
		} else {
			utils.invokeCallback(cb, err, res);
		}
	});
};

userDao.createNewUser = function (udid, cb) {
	var sql = "INSERT INTO user_info (udid, appid) VALUES (?, ?) ;";
	pomelo.app.get('dbclient').query(sql, [udid, udid], function(err, res) {
		if (err) {
			logger.error('createNewUser error ' + err.message);
			utils.invokeCallback(cb, err, null);
		} else {
			//更改默认昵称
			var mid = res.insertId;
			var nick = "游客" + mid;

			sql = "UPDATE user_info SET nick = ? WHERE mid = ?";
			pomelo.app.get('dbclient').query(sql, [nick, mid], function(err, res) {
				if (err) {
					logger.error('update nick error ' + err.message);
					utils.invokeCallback(cb, err, null);
				} else {
					sql = "SELECT * FROM user_info WHERE mid = ? ;";
					pomelo.app.get('dbclient').query(sql, [mid], function(err, res) {
						if (err) {
							logger.error('get new user error ' + err.message);
							utils.invokeCallback(cb, err, null);
						} else {
							utils.invokeCallback(cb, err, res[0]);
						}
					})
				}
			})
		}
	})
};

/**
 * get user infomation by userId
 * @param {String} uid UserId
 * @param {function} cb Callback function
 */
userDao.getUserById = function (uid, cb){
	var sql = 'select * from User where id = ?';
	var args = [uid];
	pomelo.app.get('dbclient').query(sql,args,function(err, res){
		if(err !== null){
			utils.invokeCallback(cb,err.message, null);
			return;
		}

		if (!!res && res.length > 0) {
			utils.invokeCallback(cb, null, new User(res[0]));
		} else {
			utils.invokeCallback(cb, ' user not exist ', null);
		}
	});
};

/**
 * Create a new user
 * @param (String) username
 * @param {String} password
 * @param {String} from Register source
 * @param {function} cb Call back function.
 */
userDao.createUser = function (username, password, from, cb){
	var sql = 'insert into User (name,password,`from`,loginCount,lastLoginTime) values(?,?,?,?,?)';
	var loginTime = Date.now();
	var args = [username, password, from || '', 1, loginTime];
	pomelo.app.get('dbclient').insert(sql, args, function(err,res){
		if(err !== null){
			utils.invokeCallback(cb, {code: err.number, msg: err.message}, null);
		} else {
			var user = new User({id: res.insertId, name: username, password: password, loginCount: 1, lastLoginTime:loginTime});
			utils.invokeCallback(cb, null, user);
		}
	});
};