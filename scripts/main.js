/*
 *
 * Main (Updated)
 *
 */

const Pool = require('./main/pool');

////////////////////////////////////////////////////////////////////////////////

exports.algorithms = require('./main/algorithms');
exports.daemon = require('./main/daemon');
exports.difficulty = require('./main/difficulty');
exports.create = function(poolOptions, portalOptions, authorizeFn, responseFn) {
  return new Pool(poolOptions, portalOptions, authorizeFn, responseFn);
};
