/*
 *
 * Blocks (Updated)
 *
 */

const bignum = require('bignum');
const utils = require('./utils');
const Sha3 = require('sha3');
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

  // Check if Configuration Supported
  this.checkSupported = function() {
    if (rpcData.coinbase_payload && _this.options.auxiliary && _this.options.auxiliary.enabled) {
      throw new Error('Merged mining is not supported with coins that pass an extra coinbase payload.');
    }
  }();

  // Determine Block Hash Function
  /* istanbul ignore next */
  this.blockHasher = function() {
    const algorithm = _this.options.primary.coin.algorithms.block;
    const hashDigest = Algorithms[algorithm].hash(_this.options.primary.coin);
    return function () {
      return utils.reverseBuffer(hashDigest.apply(this, arguments));
    };
  }();

  // Determine Coinbase Hash Function
  /* istanbul ignore next */
  this.coinbaseHasher = function() {
    const algorithm = _this.options.primary.coin.algorithms.coinbase;
    const hashDigest = Algorithms[algorithm].hash(_this.options.primary.coin);
    return function () {
      return hashDigest.apply(this, arguments);
    };
  }();

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

    switch (options.primary.coin.algorithms.mining) {

    // Kawpow Block Header
    case 'kawpow':
      header.write(utils.packUInt32BE(this.rpcData.height).toString('hex'), position, 4, 'hex');
      header.write(this.rpcData.bits, position += 4, 4, 'hex');
      header.write(nTime, position += 4, 4, 'hex');
      header.write(merkleRoot, position += 4, 32, 'hex');
      header.write(this.rpcData.previousblockhash, position += 32, 32, 'hex');
      header.writeUInt32BE(version, position + 32, 4);
      break;

    // Default Block Header
    default:
      header.write(nonce, position, 4, 'hex');
      header.write(_this.rpcData.bits, position += 4, 4, 'hex');
      header.write(nTime, position += 4, 4, 'hex');
      header.write(merkleRoot, position += 4, 32, 'hex');
      header.write(_this.rpcData.previousblockhash, position += 32, 32, 'hex');
      header.writeUInt32BE(version, position + 32);
      break;
    }

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
  /* istanbul ignore next */
  this.getJobParams = function(client, cleanJobs) {
    switch (options.primary.coin.algorithms.mining) {

    // Kawpow Parameters
    case 'kawpow':
      if (!_this.jobParams) {

        const nTime = utils.packUInt32BE(_this.rpcData.curtime).toString('hex');
        const adjPow = Algorithms['kawpow'].diff / _this.difficulty;
        const extraNonce1Buffer = Buffer.from(client.extraNonce1, 'hex');
        const extraNonce2Buffer = Buffer.from('00000000', 'hex');
        const epochLength = Math.floor(this.rpcData.height / Algorithms['kawpow'].epochLength);

        // Calculate Difficulty Padding
        let zeroPad = '';
        if ((64 - adjPow.toString(16).length) !== 0) {
          zeroPad = '0';
          zeroPad = zeroPad.repeat((64 - (adjPow.toString(16).length)));
        }

        let sha3Hash = new Sha3.SHA3Hash(256);
        let target = (zeroPad + adjPow.toString(16)).substr(0, 64);
        let seedHashBuffer = Buffer.alloc(32);

        // Generate Block Header Hash
        const coinbaseBuffer = _this.serializeCoinbase(extraNonce1Buffer, extraNonce2Buffer);
        const coinbaseHash = _this.coinbaseHasher(coinbaseBuffer);
        const merkleRoot = utils.reverseBuffer(_this.merkle.withFirst(coinbaseHash)).toString('hex');
        const header = _this.serializeHeader(merkleRoot, nTime, 0, _this.rpcData.version);
        const headerBuffer = utils.reverseBuffer(utils.sha256d(header));

        // Generate Seed Hash Buffer
        for (let i = 0; i < epochLength; i++) {
          sha3Hash = new Sha3.SHA3Hash(256);
          sha3Hash.update(seedHashBuffer);
          seedHashBuffer = sha3Hash.digest();
        }

        // Generate Job Parameters
        _this.jobParams = [
          _this.jobId,
          headerBuffer.toString('hex'),
          seedHashBuffer.toString('hex'),
          target,
          cleanJobs,
          _this.rpcData.height,
          _this.rpcData.bits
        ];
      }

      break;

    // Default Parameters
    default:
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
          cleanJobs
        ];
      }

      break;
    }

    return _this.jobParams;
  };
};

module.exports = Template;
