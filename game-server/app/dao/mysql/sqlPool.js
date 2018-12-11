var mysql=require("mysql");
var pomelo = require('pomelo');
var mqlMgr = {};

mqlMgr.create = function() {
    var mysqlConfig = pomelo.app.get('mysql');
    var conn = mysql.createPool({
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database,
        port: mysqlConfig.port
    });
    return conn;
};

mqlMgr.query = function (sql, args, callback) {   //可以改成sql，callback两个参数
    pool.getConnection(function(err,conn){
        if(err) {
            callback(err,null);
        } else {
            conn.query(sql, args, function(qerr,res){   //这里返回的参数可以改变一下 直接取到查询结果
                conn.release();
                callback(qerr,res);
            });
        }
    });
};

module.exports = mqlMgr;