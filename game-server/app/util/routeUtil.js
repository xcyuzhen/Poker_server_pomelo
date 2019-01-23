var exp = module.exports;
var dispatcher = require('./dispatcher');

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
