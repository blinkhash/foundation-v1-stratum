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

  // Calculate Merkle Hash Proof
  /* istanbul ignore next */
  this.getHashProof = function(hash) {
    let data = this.data;
    if (data.length === 1) {
      return Buffer.concat([utils.varIntBuffer(0), utils.packInt32LE(0)]);
    }
    const dataArray = data.map((tx) => tx.toString('hex'));
    let index = dataArray.indexOf(hash.toString('hex'));
    if (index < 0) {
      return undefined;
    }
    let branchLen = 0;
    const bufferHash = Buffer.alloc(0);
    let sideMask;
    for (;data.length > 1; branchLen += 1) {
      if (data.length % 2 !== 0) {
        data.push(data[data.length - 1]);
      }
      if(index % 2 === 0) {
        Buffer.concat([bufferHash, data[index + 1]]);
      } else {
        Buffer.concat([bufferHash, data[index - 1]]);
        sideMask = sideMask & (1 << branchLen);
      }
      const output = [];
      for (let i = 0; i < data.length; i += 2) {
        output.push(_this.concatHash(data[i], data[i + 1]));
      }
      data = output;
      index = Math.floor(index / 2);
    }
    branchLen += 1;
    return Buffer.concat([
      utils.varIntBuffer(branchLen),
      bufferHash,
      utils.serializeNumber(sideMask)
    ]);
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
  };

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
