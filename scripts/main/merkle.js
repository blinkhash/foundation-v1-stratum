/*
 *
 * Merkle (Updated)
 *
 */

// Import Required Modules
const util = require('./util.js');

// Merkle Main Function
const Merkle = function(data) {

    // Establish Merkle Variables
    const _this = this;

    // Concat Hashes Together
    this.concatHash = function(h1, h2) {
        const joined = Buffer.concat([h1, h2]);
        const dhashed = util.sha256d(joined);
        return dhashed;
    };

    // Calculate Merkle Steps
    this.calculateSteps = function(data) {
        const steps = [];
        if (data) {
            let L = data;
            const PreL = [null];
            const StartL = 2;
            let Ll = L.length;
            while (Ll > 1) {
                steps.push(L[1]);
                if (Ll % 2)
                    L.push(L[L.length - 1]);
                const Ld = [];
                const r = util.range(StartL, Ll, 2);
                r.forEach(function(i) {
                    Ld.push(_this.concatHash(L[i], L[i + 1]));
                });
                L = PreL.concat(Ld);
                Ll = L.length;
            }
        }
        return steps;
    };

    // Hash Merkle Steps With Input
    this.withFirst = function(hash) {
        _this.steps.forEach(function (step) {
            hash = util.sha256d(Buffer.concat([hash, step]));
        });
        return hash;
    };

    // Establish External Capabilities
    this.steps = _this.calculateSteps(data);

};

// Export Merkle
module.exports = Merkle;
