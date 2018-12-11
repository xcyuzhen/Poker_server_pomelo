/**
 * Initialize a new 'User' with the given 'opts'.
 *
 * @param {Object} opts
 * @api public
 */

module.exports = function (opts) {
	return new User(opts);
}

var User = function(opts) {
	this.id = opts.id;
	this.name = opts.name;
  	this.from = opts.from || '';
	this.password = opts.password;
	this.loginCount = opts.loginCount;
	this.lastLoginTime = opts.lastLoginTime;
};

/**
 * Expose 'Entity' constructor
 */
