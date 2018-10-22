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

	// filter configures
	app.filter(pomelo.timeout());
});

app.loadConfig("mysql", app.getBase() + "/config/mysql.json"); // 添加配置
app.configure('production|development', "|user|game", function () {
    var dbclient = require("./app/dao/sqlPool.js").create(); // 初始化dbclient
    app.set("dbclient", dbclient);// dbclient 为外部数据库接口，app,get("dbclient") 来使用
})

// start app
app.start();

process.on('uncaughtException', function(err) {
	console.error(' Caught exception: ' + err.stack);
});