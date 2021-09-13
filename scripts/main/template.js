/*
 *
 * Blocks (Updated)
 *
 */

const bignum = require('bignum');
const utils = require('./utils');
const Algorithms = require('./algorithms');
const Merkle = require('./merkle');
const Transactions = require('./transactions');

// Max Difficulty

////////////////////////////////////////////////////////////////////////////////

// Main Template Function
const Template = function(jobId, rpcData, extraNoncePlaceholder, auxMerkle, options) {

  const _this = this;
  this.options = options;
  this.submits = [];
  this.rpcData = rpcData;
  this.jobId = jobId;

  const algorithm = _this.options.primary.coin.algorithms.mining;
  this.target = _this.rpcData.target ? bignum(_this.rpcData.target, 16) : utils.bignumFromBitsHex(_this.rpcData.bits);
  this.difficulty = parseFloat((Algorithms[algorithm].diff / _this.target.toNumber()).toFixed(9));

  // Calculate Merkle Hashes
  this.getMerkleHashes = function(steps) {
    return steps.map((step) => {
      return step.toString('hex');
    });
  };

  // Calculate Transaction Buffers
  this.getTransactionBuffers = function(txs) {
    const txHashes = txs.map((tx) => {
      if (tx.txid !== undefined) {
        return utils.uint256BufferFromHash(tx.txid);
      }
      return utils.uint256BufferFromHash(tx.hash);
    });
    return [null].concat(txHashes);
  };

  // Calculate Masternode Vote Data
  this.getVoteData = function() {
    if (!_this.rpcData.masternode_payments) {
      return Buffer.from([]);
    }
    return Buffer.concat(
      [utils.varIntBuffer(_this.rpcData.votes.length)].concat(
        _this.rpcData.votes.map((vt) => {
          return Buffer.from(vt, 'hex');
        })
      )
    );
  };

  // Create Merkle Data
  this.createMerkle = function(rpcData) {
    return new Merkle(_this.getTransactionBuffers(rpcData.transactions));
  };

  // Create Generation Transaction
  this.createGeneration = function(rpcData, extraNoncePlaceholder, auxMerkle, options) {
    return new Transactions().bitcoin(rpcData, extraNoncePlaceholder, auxMerkle, options);
  };

  this.merkle = _this.createMerkle(_this.rpcData);
  this.generation = _this.createGeneration(_this.rpcData, extraNoncePlaceholder, auxMerkle, _this.options);
  this.previousblockhash = utils.reverseByteOrder(Buffer.from(_this.rpcData.previousblockhash, 'hex')).toString('hex');
  this.transactions = Buffer.concat(_this.rpcData.transactions.map((tx) => {
    return Buffer.from(tx.data, 'hex');
  }));

  // Serialize Block Coinbase
  this.serializeCoinbase = function(extraNonce1, extraNonce2) {
    return Buffer.concat([
      _this.generation[0],
      extraNonce1,
      extraNonce2,
      _this.generation[1]
    ]);
  };

  // Serialize Block Headers
  this.serializeHeader = function(merkleRoot, nTime, nonce, version) {
    let header = Buffer.alloc(80);
    let position = 0;
    header.write(nonce, position, 4, 'hex');
    header.write(_this.rpcData.bits, position += 4, 4, 'hex');
    header.write(nTime, position += 4, 4, 'hex');
    header.write(merkleRoot, position += 4, 32, 'hex');
    header.write(_this.rpcData.previousblockhash, position += 32, 32, 'hex');
    header.writeUInt32BE(version, position + 32);
    header = utils.reverseBuffer(header);
    return header;
  };

  // Serialize Entire Block
  this.serializeBlock = function(header, secondary) {
    const buffer = Buffer.concat([
      header,
      utils.varIntBuffer(_this.rpcData.transactions.length + 1),
      secondary,
      _this.transactions,
      _this.getVoteData(),
      Buffer.from(_this.options.primary.coin.staking ? [0] : [])
    ]);
    return buffer;
  };

  // Push Submissions to Array
  this.registerSubmit = function(header) {
    const submission = header.join('').toLowerCase();
    if (_this.submits.indexOf(submission) === -1) {
      _this.submits.push(submission);
      return true;
    }
    return false;
  };

  // Get Current Job Parameters
  this.getJobParams = function() {
    if (!_this.jobParams) {
      _this.jobParams = [
        _this.jobId,
        _this.previousblockhash,
        _this.generation[0].toString('hex'),
        _this.generation[1].toString('hex'),
        _this.getMerkleHashes(_this.merkle.steps),
        utils.packInt32BE(_this.rpcData.version).toString('hex'),
        _this.rpcData.bits,
        utils.packUInt32BE(_this.rpcData.curtime).toString('hex'),
        true
      ];
    }
    return _this.jobParams;
  };
};

module.exports = Template;
