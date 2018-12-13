var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');

var Room = function () {
	this.userList = {};
};

module.exports = Room;