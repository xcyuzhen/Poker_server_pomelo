var express = require('express');
var app = express();

app.configure(function(){
	app.use(express.methodOverride());
	app.use(express.bodyParser());
	app.use(app.router);
	app.set('view engine', 'jade');
	app.set('views', __dirname + '/public');
	app.set('view options', {layout: false});
	app.set('basepath',__dirname + '/public');
});

app.configure('development', function(){
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	var oneYear = 31557600000;
	app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
	app.use(express.errorHandler());
});

app.all("*", function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");          //允许所有跨域请求
    next();
})

app.get('/serverconfig', function (req, res) {
	var serverConfig = require('./public/config/serverconfig.json');
	res.send(JSON.stringify(serverConfig));
});

console.log("Web server has started.\nPlease log on http://127.0.0.1:3001/index.html");
app.listen(3001);

