var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'chatofpomelo-websocket');

// app configuration
app.configure('production|development', 'connector', function(){
	app.set('connectorConfig',
		{
			connector : pomelo.connectors.hybridconnector,
			heartbeat : 3,
			useDict : true,
			useProtobuf : true
		});
});

app.configure('production|development', 'gate', function(){
	app.set('connectorConfig',
		{
			connector : pomelo.connectors.hybridconnector,
			useProtobuf : true
		});
});

// app configure
app.configure('production|development', function() {
	// route configures
	app.route('chat', routeUtil.chat);
	app.route('auth', routeUtil.auth);

	// filter configures
	app.filter(pomelo.timeout());
});

app.configure('production|development', "auth", function () {
	app.loadConfig("mysql", app.getBase() + "./../shared/config/mysql.json");
    var dbclient = require("./app/dao/mysql/sqlPool.js").create();
    app.set("dbclient", dbclient);

    var robotMgr = require('./app/components/robotMgr');
	app.load(robotMgr);
});

app.configure('production|development', "auth|connector|ddz|mj", function () {
	app.loadConfig("redisConfig", app.getBase() + "/config/redis.json");
    var redisClient = require("./app/util/redisUtil").create();
    app.set("redisClient", redisClient);
});

app.configure('production|development', "ddz", function () {
	var ddzRoomMgr = require('./app/components/ddzRoomMgr');
	app.load(ddzRoomMgr);
})

app.configure('production|development', "mj", function () {
	var mjRoomMgr = require('./app/components/mjRoomMgr');
	app.load(mjRoomMgr);
})

// start app
app.start();

process.on('uncaughtException', function(err) {
	console.error(' Caught exception: ' + err.stack);
});