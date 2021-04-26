/*
 *
 * Index (Updated)
 *
 */

const Pool = require('./main/pool.js');
exports.algorithms = require('./main/algorithms.js');
exports.daemon = require('./main/daemon.js');
exports.difficulty = require('./main/difficulty.js');
exports.start = function(poolOptions, authorizeFn) {
    return new Pool(poolOptions, authorizeFn);
};
