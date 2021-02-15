/*
 *
 * Merkle (Updated)
 *
 */

// Import Required Modules
var async = require('async');
var crypto = require('crypto');
var util = require('./util.js');

// Import Promise Module
var Promise = require('promise');

// Merkle Main Function
var Merkle = function(data) {

    // Concat Hashes Together
    function concatHash(h1, h2) {
        var joined = Buffer.concat([h1, h2]);
        var dhashed = util.sha256d(joined);
        return dhashed;
    }

    // Hash the Input Data Twice
    function doubleHash(data, algorithm) {
        algorithm = algorithm || 'sha256';
        var hash1 = crypto.createHash(algorithm).update(Buffer.from(data, 'hex')).digest();
        var hash2 = crypto.createHash(algorithm).update(hash1).digest('hex');
        return hash2;
    }

    // Reverse Array of Hashes
    function reverseHash(hashes, callback) {
        var reversedHashes = async.map(hashes, function (element, callback) {
            callback(null, element.match(/.{2}/g).reverse().join(''));
        }, callback);
    }

    // Calculate Merkle Steps
    function calculateSteps(data) {
        var steps = [];
        if (data) {
            var L = data;
            var PreL = [null];
            var StartL = 2;
            var Ll = L.length;
            if (Ll > 1) {
                while (true) {
                    if (Ll === 1) {
                        break;
                    }
                    steps.push(L[1]);
                    if (Ll % 2)
                        L.push(L[L.length - 1]);
                    var Ld = [];
                    var r = util.range(StartL, Ll, 2);
                    r.forEach(function(i) {
                        Ld.push(concatHash(L[i], L[i + 1]));
                    });
                    L = PreL.concat(Ld);
                    Ll = L.length;
                }
            }
        }
        return steps;
    }

    // Calculate Merkle Recursively
    function recursiveMerkle(hashes, callback) {

        // Establish Merkle Variables
        var concatHashes = []
        var merkleTree = {};

        // Duplicate Last Element if Array.length is Odd */
        if (hashes.length % 2 === 1) {
            hashes.push(hashes[hashes.length - 1]);
        }

        // Concatenate Hashes and Push to New Array
        for (var i = 0, length = hashes.length; i < length; i += 2) {
            concatHashes.push(hashes[i] + hashes[i + 1]);
        }

        // Map Array Elements with Hash Functions
        async.map(concatHashes, function (data, callback) {
            var hash = doubleHash(data);
            callback(null, hash);
        }, function (err, newHashes) {
            if (err) {
                return callback(err);
            }
            if (newHashes.length > 1) {
                recursiveMerkle(newHashes, callback);
            } else {
                merkleTree.root = newHashes[0] || '  ';
                callback(null, merkleTree);
            }
        });
    }

    // Generate Merkle Tree Recursively
    function generateMerkle(array, options, callback) {

        // Check if Options Exists
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // Generate Merkle Tree
        if (options.reverse === false) {
            recursiveMerkle(array, callback);
        }
        else {
            reverseHash(array, function (err, reversedHashes) {
                if (err) {
                    return callback(err);
                }
                recursiveMerkle(reversedHashes, function (err, merkle) {
                    if (err) {
                        return callback(err);
                    }
                    merkle.root = merkle.root.match(/.{2}/g).reverse().join('');
                    callback(null, merkle);
                });
            });
        }
    }

    // Calculate Merkle Root
    function calculateRoot(hashes) {
        var result = Promise.denodeify(generateMerkle)(hashes);
        return Object.values(result)[2].root;
    }

    // Get Merkle Root
    function getRoot(rpcData, generateTxRaw) {
        hashes = [util.reverseBuffer(Buffer.from(generateTxRaw, 'hex')).toString('hex')];
        rpcData.transactions.forEach(function (value) {
            if (value.txid !== undefined) {
                hashes.push(value.txid);
            } else {
                hashes.push(value.hash);
            }
        });
        if (hashes.length === 1) {
            return hashes[0];
        }
        var result = calculateRoot(hashes);
        return result;
    }

    // Hash Merkle Steps With Input
    function withFirst(hash) {
        this.steps.forEach(function (step) {
            hash = util.sha256d(Buffer.concat([hash, step]))
        });
        return hash;
    }

    // Establish Merkle Variables
    this.data = data;
    this.getRoot = getRoot;
    this.steps = calculateSteps(data);
    this.withFirst = withFirst;
}

// Export Merkle
module.exports = Merkle;
