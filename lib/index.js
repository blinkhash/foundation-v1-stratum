/*
 *
 * Index (Updated)
 *
 */

// Import Required Modules
var net = require('net');
var events = require('events');

// Load Hashing Algorithms
require('./algorithms.js');

// Establish Main Pool Exports
var Pool = require('./pool.js');
exports.daemon = require('./daemon.js');
exports.varDiff = require('./varDiff.js');
exports.createPool = function(poolOptions, authorizeFn) {
    var newPool = new Pool(poolOptions, authorizeFn);
    return newPool;
};
