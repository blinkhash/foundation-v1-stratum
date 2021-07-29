/*
 *
 * Merkle (Updated)
 *
 */

const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Merkle Function
const Merkle = function(data) {

  const _this = this;
  this.data = data;

  // Concat Hash Array Together
  this.concatHash = function(h1, h2) {
    const joined = Buffer.concat([h1, h2]);
    const dhashed = utils.sha256d(joined);
    return dhashed;
  };

  // Calculate Merkle Root w/o Coinbase
  this.calculateRoot = function(data) {
    const modified = Object.assign([], data);
    if (modified.length > 1) {
      if (modified.length % 2 !== 0) {
        modified.push(modified[modified.length - 1]);
      }
      const updated = [];
      for (let i = 0; i < modified.length; i += 2) {
        updated.push(_this.concatHash(modified[i], modified[i + 1]));
      }
      return _this.calculateRoot(updated);
    } else {
      return modified[0];
    }
  }

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

  // Validate Data Struture
  this.validateData = function(data) {
    if (data) {
      if (data.length >= 1) {
        return data[0] === null ? data.slice(1) : data;
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  // Hash Merkle Steps With Input
  this.withFirst = function(hash) {
    _this.steps.forEach((step) => {
      hash = utils.sha256d(Buffer.concat([hash, step]));
    });
    return hash;
  };

  // Calculate Merkle Root/Steps
  this.root = _this.calculateRoot(_this.validateData(data));
  this.steps = _this.calculateSteps(data);
};

module.exports = Merkle;
