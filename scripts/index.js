/*
 *
 * Index (Updated)
 *
 */

// Import Required Modules
let net = require('net');
const events = require('events');

// Load Hashing Algorithms
require('./main/algorithms.js');

// Establish Main Pool Exports
let Pool = require('./main/pool.js');
exports.daemon = require('./main/daemon.js');
exports.difficulty = require('./main/difficulty.js');
exports.createPool = function(poolOptions, authorizeFn) {
    return new Pool(poolOptions, authorizeFn);
};
