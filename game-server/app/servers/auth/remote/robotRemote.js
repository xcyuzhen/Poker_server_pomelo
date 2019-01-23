var utils = require('../../../util/utils');

module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	this.robotMgrService = app.get('robotMgrService');
};

var pro = Remote.prototype;

/**
 * 用户登录
 *
 * @param  {Object}   	param 参数对象
 * @param  {Function} 	cb 回调函数
 * @return {Void}
 */
pro.reqOneRobot = function(param, cb) {
	var self = this;

	self.robotMgrService.reqOneRobot(param, function (err, resp) {
		utils.invokeCallback(cb, err, resp);
	});
};