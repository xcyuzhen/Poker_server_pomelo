var RoomMgrService = require('../service/roomMgrService');
var MjRoom = require('../room/mjRoom');
var GameConfig = require('../models/gameConfig');

module.exports = function(app, opts) {
    var cmp = new Component(app, opts);
    app.set('roomMgrService', cmp, true);
    return cmp;
};

/**
 * RoomMgr component. Manage rooms.
 *
 * @param {Object} app  current application context
 * @param {Object} opts attach parameters
 */
var Component = function(app, opts) {
    opts = opts || {};
    this.app = app;
    this.service = new RoomMgrService(app, opts);

    var getFun = function(m) {
        return (function() {
            return function() {
              return self.service[m].apply(self.service, arguments);
            };
        })();
    };

    // proxy the service methods except the lifecycle interfaces of component
    var method, self = this;
    for(var m in this.service) {
        if(m !== 'afterStart') {
            method = this.service[m];
            if(typeof method === 'function') {
                this[m] = getFun(m);
            }
        }
    }
};

var pro = Component.prototype;
pro.name = '__roomMgr__';

pro.afterStart = function (cb) {
    this.service.initGameConfig.call(this.service, GameConfig.gameList[1]);
    this.service.initRooms.call(this.service, MjRoom);
    process.nextTick(cb);
}