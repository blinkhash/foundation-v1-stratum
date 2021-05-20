/*
 *
 * Main (Updated)
 *
 */

const Pool = require('./main/pool.js');

////////////////////////////////////////////////////////////////////////////////

exports.algorithms = require('./main/algorithms.js');
exports.daemon = require('./main/daemon.js');
exports.difficulty = require('./main/difficulty.js');
exports.create = function(poolOptions, authorizeFn, responseFn) {
  return new Pool(poolOptions, authorizeFn, responseFn);
};
