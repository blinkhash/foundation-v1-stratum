/*
 *
 * Merkle (Updated)
 *
 */

const utils = require('./utils.js');

////////////////////////////////////////////////////////////////////////////////

// Main Merkle Function
const Merkle = function(data) {

  const _this = this;

  // Concat Hash Array Together
  this.concatHash = function(h1, h2) {
    const joined = Buffer.concat([h1, h2]);
    const dhashed = utils.sha256d(joined);
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
        if (Ll % 2) {
          L.push(L[L.length - 1]);
        }
        const Ld = [];
        const r = utils.range(StartL, Ll, 2);
        r.forEach((i) => {
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
    _this.steps.forEach((step) => {
      hash = utils.sha256d(Buffer.concat([hash, step]));
    });
    return hash;
  };

  // Calculate Merkle Steps
  this.steps = _this.calculateSteps(data);
};

module.exports = Merkle;
