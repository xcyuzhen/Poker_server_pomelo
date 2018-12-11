var RoomMgrService = require('../service/roomMgrService');

module.exports = function(app, opts) {
  var service = new RoomMgrService(app, opts);
  app.set('roomMgrService', service, true);
  service.name = '__roomMgr__';
  return service;
};