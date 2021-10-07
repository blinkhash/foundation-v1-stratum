/*
 *
 * Manager (Updated)
 *
 */

const events = require('events');
const crypto = require('crypto');
const bignum = require('bignum');
const utils = require('./utils');
const Algorithms = require('./algorithms');
const Merkle = require('./merkle');
const Template = require('./template');

////////////////////////////////////////////////////////////////////////////////

// Generate Unique ExtraNonce for each Subscriber
const ExtraNonceCounter = function(configInstanceId) {
  const instanceId = configInstanceId || crypto.randomBytes(4).readUInt32LE(0);
  this.counter = instanceId << 27;
  this.size = 4;
  this.next = function() {
    const extraNonce = utils.packUInt32BE(Math.abs(this.counter += 1));
    return extraNonce.toString('hex');
  };
};

// Generate Unique Job for each Template
const JobCounter = function() {
  this.counter = 0;
  this.next = function() {
    this.counter += 1;
    if (this.counter % 0xffff === 0) {
      this.counter = 1;
    }
    return this.cur();
  };
  this.cur = function() {
    return this.counter.toString(16);
  };
};

// Main Manager Function
const Manager = function(options) {

  const _this = this;
  this.options = options;

  const algorithm = _this.options.primary.coin.algorithms.mining;
  const shareMultiplier = Algorithms[algorithm].multiplier;

  this.currentJob;
  this.validJobs = {};
  this.jobCounter = new JobCounter();
  this.extraNonceCounter = new ExtraNonceCounter(_this.options.instanceId);
  this.extraNoncePlaceholder = Buffer.from('f000000ff111111f', 'hex');
  this.extraNonce2Size = _this.extraNoncePlaceholder.length - _this.extraNonceCounter.size;

  // Build Merkle Tree from Auxiliary Chain
  this.buildMerkleTree = function(auxData) {
    if (auxData) {
      const merkleData = [Buffer.alloc(32)];
      const position = utils.getAuxMerklePosition(auxData.chainid, 1);
      const hash = utils.uint256BufferFromHash(auxData.hash);
      hash.copy(merkleData[position]);
      return new Merkle(merkleData);
    }
    return null;
  };

  // Update Current Managed Job
  this.updateCurrentJob = function(rpcData) {
    const auxMerkle = _this.buildMerkleTree(rpcData.auxData);
    const tmpTemplate = new Template(
      _this.jobCounter.next(),
      Object.assign({}, rpcData),
      _this.extraNoncePlaceholder,
      auxMerkle,
      _this.options
    );
    _this.currentJob = tmpTemplate;
    _this.emit('updatedBlock', tmpTemplate);
    _this.validJobs[tmpTemplate.jobId] = tmpTemplate;
    _this.auxMerkle = auxMerkle;
  };

  // Check if New Block is Processed
  this.processTemplate = function(rpcData, processNew) {

    // If Current Job !== Previous Job
    let isNewBlock = typeof(_this.currentJob) === 'undefined';
    if ((!isNewBlock && _this.currentJob.rpcData.previousblockhash !== rpcData.previousblockhash) ||
        (!isNewBlock && _this.currentJob.rpcData.bits !== rpcData.bits)) {
      isNewBlock = true;
      if (rpcData.height < _this.currentJob.rpcData.height)
        isNewBlock = false;
    }

    // Check for New Block
    if (!isNewBlock && !processNew) {
      return false;
    }

    // Build New Block Template
    const auxMerkle = _this.buildMerkleTree(rpcData.auxData);
    const tmpTemplate = new Template(
      _this.jobCounter.next(),
      Object.assign({}, rpcData),
      _this.extraNoncePlaceholder,
      auxMerkle,
      _this.options
    );

    // Update Current Template
    _this.currentJob = tmpTemplate;
    _this.emit('newBlock', tmpTemplate);
    _this.validJobs[tmpTemplate.jobId] = tmpTemplate;
    _this.auxMerkle = auxMerkle;
    return true;
  };

  // Process New Submitted Share
  this.processShare = function(
    jobId, previousDifficulty, difficulty, extraNonce1, extraNonce2,
    nTime, nonce, ipAddress, port, addrPrimary, addrAuxiliary, versionBit,
    versionMask, asicboost) {

    // Share is Invalid
    const shareError = function(error) {
      _this.emit('share', {
        job: jobId,
        ip: ipAddress,
        port: port,
        difficulty: difficulty,
        worker: addrPrimary,
        error: error[1],
      }, null, null);
      return {error: error, result: null};
    };

    // Edge Cases to Check if Share is Invalid
    const submitTime = Date.now() / 1000 | 0;
    const job = _this.validJobs[jobId];
    if (extraNonce2.length / 2 !== _this.extraNonce2Size)
      return shareError([20, 'incorrect size of extranonce2']);
    if (typeof job === 'undefined' || job.jobId != jobId) {
      return shareError([21, 'job not found']);
    }
    if (nTime.length !== 8) {
      return shareError([20, 'incorrect size of ntime']);
    }
    const nTimeInt = parseInt(nTime, 16);
    if (nTimeInt < job.rpcData.curtime || nTimeInt > submitTime + 7200) {
      return shareError([20, 'ntime out of range']);
    }
    if (nonce.length !== 8) {
      return shareError([20, 'incorrect size of nonce']);
    }
    if (!job.registerSubmit([extraNonce1, extraNonce2, nTime, nonce])) {
      return shareError([22, 'duplicate share']);
    }

    // Check for asicboost Support
    let version = job.rpcData.version;
    if (asicboost && versionBit !== undefined) {
      const vBit = parseInt('0x' + versionBit);
      const vMask = parseInt('0x' + versionMask);
      if ((vBit & ~vMask) !== 0) {
        return shareError([20, 'invalid version bit']);
      }
      version = (version & ~vMask) | (vBit & vMask);
    }

    // Establish Share Information
    let blockValid = false;
    const extraNonce1Buffer = Buffer.from(extraNonce1, 'hex');
    const extraNonce2Buffer = Buffer.from(extraNonce2, 'hex');
    const coinbaseBuffer = job.serializeCoinbase(extraNonce1Buffer, extraNonce2Buffer);
    const coinbaseHash = job.coinbaseHasher(coinbaseBuffer);
    const merkleRoot = utils.reverseBuffer(job.merkle.withFirst(coinbaseHash)).toString('hex');

    // Start Generating Block Hash
    const headerDigest = Algorithms[algorithm].hash(_this.options.primary.coin);
    const headerBuffer = job.serializeHeader(merkleRoot, nTime, nonce, version);
    const headerHash = headerDigest(headerBuffer, nTimeInt);
    const headerBigNum = bignum.fromBuffer(headerHash, {endian: 'little', size: 32});

    // Calculate Share Difficulty
    const shareDiff = Algorithms[algorithm].diff / headerBigNum.toNumber() * shareMultiplier;
    const blockDiffAdjusted = job.difficulty * shareMultiplier;
    const blockHex = job.serializeBlock(headerBuffer, coinbaseBuffer).toString('hex');
    const blockHash = job.blockHasher(headerBuffer, nTime).toString('hex');

    // Check if Share is Valid Block Candidate
    /* istanbul ignore next */
    if (job.target.ge(headerBigNum)) {
      blockValid = true;
    } else {
      if (shareDiff / difficulty < 0.99) {
        if (previousDifficulty && shareDiff >= previousDifficulty) {
          difficulty = previousDifficulty;
        } else {
          return shareError([23, 'low difficulty share of ' + shareDiff]);
        }
      }
    }

    // Build Share Object Data
    /* istanbul ignore next */
    const shareData = {
      job: jobId,
      ip: ipAddress,
      port: port,
      addrPrimary: addrPrimary,
      addrAuxiliary: addrAuxiliary,
      blockDiffPrimary : blockDiffAdjusted,
      blockType: blockValid ? 'primary' : 'share',
      coinbase: coinbaseBuffer,
      difficulty: difficulty,
      hash: blockHash,
      hex: blockHex,
      header: headerHash,
      headerDiff: headerBigNum,
      height: job.rpcData.height,
      reward: job.rpcData.coinbasevalue,
      shareDiff: shareDiff.toFixed(8),
    };

    const auxShareData = {
      job: jobId,
      ip: ipAddress,
      port: port,
      addrPrimary: addrPrimary,
      addrAuxiliary: addrAuxiliary,
      blockDiffPrimary : blockDiffAdjusted,
      blockType: 'auxiliary',
      coinbase: coinbaseBuffer,
      difficulty: difficulty,
      hash: blockHash,
      hex: blockHex,
      header: headerHash,
      headerDiff: headerBigNum,
      shareDiff: shareDiff.toFixed(8),
    };

    _this.emit('share', shareData, auxShareData, blockValid);
    return { error: null, hash: blockHash, hex: blockHex, result: true };
  };
};

module.exports = Manager;
Manager.prototype.__proto__ = events.EventEmitter.prototype;
