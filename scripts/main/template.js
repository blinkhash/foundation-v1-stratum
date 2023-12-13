/*
 *
 * Template (Updated)
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
const Template = function(poolConfig, rpcData, jobId, extraNoncePlaceholder, auxMerkle) {

  const _this = this;
  this.poolConfig = poolConfig;
  this.submits = [];
  this.rpcData = rpcData;
  this.jobId = jobId;

  const algorithm = _this.poolConfig.primary.coin.algorithms.mining;
  this.target = _this.rpcData.target ? bignum(_this.rpcData.target, 16) : utils.bignumFromBitsHex(_this.rpcData.bits);
  this.difficulty = parseFloat((Algorithms[algorithm].diff / _this.target.toNumber()).toFixed(9));

  // Check if Configuration Supported
  this.checkSupported = function() {
    if (rpcData.coinbase_payload && _this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {
      throw new Error('Merged mining is not supported with coins that pass an extra coinbase payload.');
    }
  }();

  // Determine Block Hash Function
  /* istanbul ignore next */
  this.blockHasher = function() {
    const algorithm = _this.poolConfig.primary.coin.algorithms.block;
    const hashDigest = Algorithms[algorithm].hash(_this.poolConfig.primary.coin);
    return function () {
      return utils.reverseBuffer(hashDigest.apply(this, arguments));
    };
  }();

  // Determine Coinbase Hash Function
  /* istanbul ignore next */
  this.coinbaseHasher = function() {
    const algorithm = _this.poolConfig.primary.coin.algorithms.coinbase;
    const hashDigest = Algorithms[algorithm].hash(_this.poolConfig.primary.coin);
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
  this.createGeneration = function(poolConfig, rpcData, extraNoncePlaceholder, auxMerkle) {
    return new Transactions().default(poolConfig, rpcData, extraNoncePlaceholder, auxMerkle);
  };

  this.merkle = _this.createMerkle(_this.rpcData);
  this.generation = _this.createGeneration(_this.poolConfig, _this.rpcData, extraNoncePlaceholder, auxMerkle);
  this.previousblockhash = utils.reverseByteOrder(Buffer.from(_this.rpcData.previousblockhash, 'hex')).toString('hex');
  this.transactions = Buffer.concat(_this.rpcData.transactions.map((tx) => {
    return Buffer.from(tx.data, 'hex');
  }));

  // Serialize Block Coinbase
  this.serializeCoinbase = function(extraNonce1, extraNonce2) {
    let buffer;
    switch (algorithm) {

    // Kawpow/Firopow Block Header
    case 'kawpow':
    case 'firopow':
      buffer = Buffer.concat([
        _this.generation[0],
        extraNonce1,
        _this.generation[1]
      ]);
      break;

    default:
      buffer = Buffer.concat([
        _this.generation[0],
        extraNonce1,
        extraNonce2,
        _this.generation[1]
      ]);
      break;
    }

    return buffer;
  };

  // Serialize Block Headers
  this.serializeHeader = function(merkleRoot, nTime, nonce, version) {
    let header = Buffer.alloc(80);
    let position = 0;
    switch (algorithm) {

    // Kawpow/Firopow Block Header
    case 'kawpow':
    case 'firopow':
      header.write(utils.packUInt32BE(this.rpcData.height).toString('hex'), position, 4, 'hex');
      header.write(this.rpcData.bits, position += 4, 4, 'hex');
      header.write(nTime, position += 4, 4, 'hex');
      header.write(utils.reverseBuffer(merkleRoot).toString('hex'), position += 4, 32, 'hex');
      header.write(this.rpcData.previousblockhash, position += 32, 32, 'hex');
      header.writeUInt32BE(version, position + 32, 4);
      break;

    // Default Block Header
    default:
      header.write(nonce, position, 4, 'hex');
      header.write(_this.rpcData.bits, position += 4, 4, 'hex');
      header.write(nTime, position += 4, 4, 'hex');
      header.write(utils.reverseBuffer(merkleRoot).toString('hex'), position += 4, 32, 'hex');
      header.write(_this.rpcData.previousblockhash, position += 32, 32, 'hex');
      header.writeUInt32BE(version, position + 32);
      break;
    }

    header = utils.reverseBuffer(header);
    return header;
  };

  // Serialize Entire Block
  this.serializeBlock = function(header, coinbase, nonce, mixHash) {
    let buffer;
    switch (algorithm) {

    // Kawpow/Firopow Block Structure
    case 'kawpow':
    case 'firopow':
      buffer = Buffer.concat([
        header,
        nonce,
        utils.reverseBuffer(mixHash),
        utils.varIntBuffer(_this.rpcData.transactions.length + 1),
        coinbase,
        _this.transactions,
      ]);
      break;

    // Default Block Structure
    default:
      buffer = Buffer.concat([
        header,
        utils.varIntBuffer(_this.rpcData.transactions.length + 1),
        coinbase,
        _this.transactions,
        _this.getVoteData(),
        Buffer.from(_this.poolConfig.primary.coin.hybrid ? [0] : []),
        Buffer.concat(_this.rpcData.mweb ? [
          Buffer.from([1]),
          Buffer.from(_this.rpcData.mweb, 'hex')
        ] : []),
      ]);
      break;
    }

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

  // Generate Job Parameters for Clients
  /* istanbul ignore next */
  this.getJobParams = function(client, cleanJobs) {

    // Establish Parameter Variables
    let adjPow, epochLength, extraNonce1Buffer, zeroPad;
    let coinbaseBuffer, coinbaseHash, merkleRoot;
    let version, nTime, target, header, headerBuffer;
    let sha3Hash, seedHashBuffer;

    // Process Job Parameters
    switch (algorithm) {

    // Kawpow/Firopow Parameters
    case 'kawpow':
    case 'firopow':

      // Check if Client has ExtraNonce Set
      if (!client.extraNonce1) {
        client.extraNonce1 = utils.extraNonceCounter(2).next();
      }

      adjPow = Algorithms[algorithm].diff / _this.difficulty;
      epochLength = Math.floor(this.rpcData.height / Algorithms[algorithm].epochLength);
      extraNonce1Buffer = Buffer.from(client.extraNonce1, 'hex');

      // Calculate Difficulty Padding
      zeroPad = '';
      if ((64 - adjPow.toString(16).length) !== 0) {
        zeroPad = '0';
        zeroPad = zeroPad.repeat((64 - (adjPow.toString(16).length)));
      }

      // Generate Coinbase Buffer
      coinbaseBuffer = _this.serializeCoinbase(extraNonce1Buffer);
      coinbaseHash = _this.coinbaseHasher(coinbaseBuffer);
      merkleRoot = _this.merkle.withFirst(coinbaseHash);

      // Generate Block Header Hash
      version = _this.rpcData.version;
      nTime = utils.packUInt32BE(_this.rpcData.curtime).toString('hex');
      target = (zeroPad + adjPow.toString(16)).substr(0, 64);
      header = _this.serializeHeader(merkleRoot, nTime, 0, version);
      headerBuffer = utils.reverseBuffer(utils.sha256d(header));

      // Generate Seed Hash Buffer
      sha3Hash = new Sha3.SHA3Hash(256);
      seedHashBuffer = Buffer.alloc(32);
      for (let i = 0; i < epochLength; i++) {
        sha3Hash = new Sha3.SHA3Hash(256);
        sha3Hash.update(seedHashBuffer);
        seedHashBuffer = sha3Hash.digest();
      }

      // Generate Job Parameters
      return [
        _this.jobId,
        headerBuffer.toString('hex'),
        seedHashBuffer.toString('hex'),
        target,
        cleanJobs,
        _this.rpcData.height,
        _this.rpcData.bits
      ];

    // Default Parameters
    default:
      return [
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
  };
};

module.exports = Template;
