var logger = require('pomelo-logger').getLogger(__filename);
var exp = module.exports;
var dispatcher = require('./dispatcher');
var utils = require('./utils');
var async = require('async');

exp.chat = function(session, msg, app, cb) {
	var chatServers = app.getServersByType('chat');

	if(!chatServers || chatServers.length === 0) {
		cb(new Error('can not find chat servers.'));
		return;
	}

	var res = dispatcher.dispatch(session.get('rid'), chatServers);

	cb(null, res.id);
};

exp.auth = function(session, msg, app, cb) {
	var authServers = app.getServersByType('auth');

	if(!authServers || authServers.length === 0) {
		cb(new Error('can not find auth servers.'));
		return;
	}

	var res = authServers[0];

	cb(null, res.id);
};

exp.mj = function(session, msg, app, cb) {
	var serverName = 'mj';
	var mjServers = app.getServersByType(serverName);

	if(!mjServers || mjServers.length === 0) {
		cb(new Error('can not find mj servers.'));
		return;
	}

	var level = parseInt(msg.level);
	var serverList = [];
	for (var i = 0; i < mjServers.length; i++) {
		var serverID = mjServers[i];
		if (level == utils.getGroupLevelByServerID(serverID)) {
			serverList.push(serverID);
		}
	}

	if (serverList.length <= 0) {
		cb(new Error('can not find mj servers by level: ' + level));
		return;
	}

	//开始检测
	var find = false;
	async.forEachSeries(serverList, function (serverID, callBack) {
		if (find) {
			callBack();
		} else {
			app.rpc[serverName].roomRemote.getServerFullStatus.toServer(serverID, {}, function (err, res) {
				if (!err) {
					if (res === false) {
						find = true;
						cb(null, serverID);
					}
				};

				callBack(err);
			});
		}
	}, function (err) {
		if (err) {
			logger.error(err);
		}
	});
};
