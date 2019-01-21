var RobotMgrService = require('../service/robotMgrService');

module.exports = function(app, opts) {
    var cmp = new Component(app, opts);
    app.set('robotMgrService', cmp, true);
    return cmp;
};

/**
 * RobotMgr component. Manage robots.
 *
 * @param {Object} app  current application context
 * @param {Object} opts attach parameters
 */
var Component = function(app, opts) {
    opts = opts || {};
    this.app = app;
    this.service = new RobotMgrService(app, opts);

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
        method = this.service[m];
        if(typeof method === 'function') {
            this[m] = getFun(m);
        }
    }
};

var pro = Component.prototype;
pro.name = '__robotMgr__';