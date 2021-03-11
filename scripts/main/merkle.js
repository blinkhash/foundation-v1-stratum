/*
 *
 * Merkle (Updated)
 *
 */

// Import Required Modules
let async = require('async');
let crypto = require('crypto');
let util = require('./util.js');

// Import Promise Module
let Promise = require('promise');

// Merkle Main Function
let Merkle = function(data) {

    // Concat Hashes Together
    function concatHash(h1, h2) {
        let joined = Buffer.concat([h1, h2]);
        let dhashed = util.sha256d(joined);
        return dhashed;
    }

    // Calculate Merkle Steps
    function calculateSteps(data) {
        let steps = [];
        if (data) {
            let L = data;
            let PreL = [null];
            let StartL = 2;
            let Ll = L.length;
            if (Ll > 1) {
                while (true) {
                    if (Ll === 1) {
                        break;
                    }
                    steps.push(L[1]);
                    if (Ll % 2)
                        L.push(L[L.length - 1]);
                    let Ld = [];
                    let r = util.range(StartL, Ll, 2);
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

    // Hash Merkle Steps With Input
    function withFirst(hash) {
        this.steps.forEach(function (step) {
            hash = util.sha256d(Buffer.concat([hash, step]))
        });
        return hash;
    }

    // Establish External Capabilities
    this.steps = calculateSteps(data);
    this.withFirst = withFirst;
}

// Export Merkle
module.exports = Merkle;
