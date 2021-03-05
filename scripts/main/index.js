/*
 *
 * Index (Updated)
 *
 */

// Import Required Modules
let net = require('net');
let events = require('events');

// Load Hashing Algorithms
require('./algorithms.js');

// Establish Main Pool Exports
let Pool = require('./pool.js');
exports.daemon = require('./daemon.js');
exports.difficulty = require('./difficulty.js');
exports.createPool = function(poolOptions, authorizeFn) {
    let newPool = new Pool(poolOptions, authorizeFn);
    return newPool;
};
