/*
 *
 * Manager (Updated)
 *
 */

const events = require('events');
const bignum = require('bignum');
const utils = require('./utils');
const Algorithms = require('./algorithms');
const Merkle = require('./merkle');
const Template = require('./template');

////////////////////////////////////////////////////////////////////////////////

// Main Manager Function
const Manager = function(poolConfig, portalConfig) {

  const _this = this;
  this.poolConfig = poolConfig;
  this.portalConfig = portalConfig;

  const algorithm = _this.poolConfig.primary.coin.algorithms.mining;
  const shareMultiplier = Algorithms[algorithm].multiplier;
  const extraNonceSize = algorithm === 'kawpow' || algorithm === 'firopow' ? 2 : 4;

  this.currentJob;
  this.validJobs = {};
  this.jobCounter = utils.jobCounter();
  this.extraNoncePlaceholder = algorithm === 'kawpow' || algorithm === 'firopow' ? Buffer.from('f000', 'hex') : Buffer.from('f000000ff111111f', 'hex');
  this.extraNonceCounter = utils.extraNonceCounter(extraNonceSize);
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
      _this.poolConfig,
      Object.assign({}, rpcData),
      _this.jobCounter.next(),
      _this.extraNoncePlaceholder,
      auxMerkle,
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
      _this.poolConfig,
      Object.assign({}, rpcData),
      _this.jobCounter.next(),
      _this.extraNoncePlaceholder,
      auxMerkle,
    );

    // Update Current Template
    _this.validJobs = {};
    _this.currentJob = tmpTemplate;
    _this.emit('newBlock', tmpTemplate);
    _this.validJobs[tmpTemplate.jobId] = tmpTemplate;
    _this.auxMerkle = auxMerkle;
    return true;
  };

  // Process Submitted Share
  this.processShare = function(
    jobId, previousDifficulty, difficulty, ipAddress, port, addrPrimary,
    addrAuxiliary, submission) {

    // Main Pool Identifier
    const identifier = this.portalConfig.identifier || '';

    // Share is Invalid
    const shareError = function(error) {
      _this.emit('share', {
        job: jobId,
        ip: ipAddress,
        port: port,
        difficulty: difficulty,
        identifier: identifier,
        worker: addrPrimary,
        error: error[1],
      }, null, null);
      return { error: error, result: null };
    };

    // Establish Share Variables
    let submitTime, job, nTimeInt, blockValid, nTime, version;
    let extraNonce1Buffer, extraNonce2Buffer, nonceBuffer, mixHashBuffer;
    let coinbaseBuffer, coinbaseHash, merkleRoot;
    let headerDigest, headerBuffer, headerHash, headerBigNum;
    let headerHashBuffer, hashOutputBuffer, isValid;
    let shareDiff, blockDiffAdjusted, blockHex, blockHash;
    let shareData, auxShareData;

    // Process Submitted Share
    switch (_this.poolConfig.primary.coin.algorithms.mining) {

    // Kawpow/Firopow Share Submission
    /* istanbul ignore next */
    case 'kawpow':
    case 'firopow':

      // Edge Cases to Check if Share is Invalid
      submitTime = Date.now() / 1000 | 0;
      job = _this.validJobs[jobId];
      if (typeof job === 'undefined' || job.jobId != jobId) {
        return shareError([21, 'job not found']);
      }
      if (!utils.isHexString(submission.headerHash)) {
        return shareError([20, 'invalid header submission [1]']);
      }
      if (!utils.isHexString(submission.mixHash)) {
        return shareError([20, 'invalid mixHash submission']);
      }
      if (!utils.isHexString(submission.nonce)) {
        return shareError([20, 'invalid nonce submission']);
      }
      if (submission.mixHash.length !== 64) {
        return shareError([20, 'incorrect size of mixHash']);
      }
      if (submission.nonce.length !== 16) {
        return shareError([20, 'incorrect size of nonce']);
      }
      if (submission.nonce.indexOf(submission.extraNonce1.substring(0, 4)) !== 0) {
        return shareError([24, 'nonce out of worker range']);
      }
      if (!addrPrimary && !addrAuxiliary) {
        return shareError([20, 'worker address isn\'t set properly']);
      }
      if (!job.registerSubmit([submission.extraNonce1, submission.nonce, submission.headerHash, submission.mixHash])) {
        return shareError([22, 'duplicate share']);
      }

      // Establish Share Information
      blockValid = false;
      extraNonce1Buffer = Buffer.from(submission.extraNonce1, 'hex');
      nonceBuffer = utils.reverseBuffer(Buffer.from(submission.nonce, 'hex'));
      mixHashBuffer = Buffer.from(submission.mixHash, 'hex');

      // Generate Coinbase Buffer
      coinbaseBuffer = job.serializeCoinbase(extraNonce1Buffer);
      coinbaseHash = job.coinbaseHasher(coinbaseBuffer);
      merkleRoot = job.merkle.withFirst(coinbaseHash);

      // Start Generating Block Hash
      version = job.rpcData.version;
      nTime = utils.packUInt32BE(job.rpcData.curtime).toString('hex');
      headerDigest = Algorithms[algorithm].hash(_this.poolConfig.primary.coin);
      headerBuffer = job.serializeHeader(merkleRoot, nTime, submission.nonce, version);
      headerHashBuffer = utils.reverseBuffer(utils.sha256d(headerBuffer));
      headerHash = headerHashBuffer.toString('hex');

      // Check if Generated Header Matches
      if (submission.headerHash !== headerHash) {
        return shareError([20, 'invalid header submission [2]']);
      }

      // Check Validity of Solution
      hashOutputBuffer = Buffer.alloc(32);
      isValid = headerDigest(headerHashBuffer, nonceBuffer, job.rpcData.height, mixHashBuffer, hashOutputBuffer);
      headerBigNum = bignum.fromBuffer(hashOutputBuffer, {endian: 'big', size: 32});

      // Check if Submission is Valid Solution
      if (!isValid) {
        return shareError([20, 'submission is not valid']);
      }

      // Calculate Share Difficulty
      shareDiff = Algorithms[algorithm].diff / headerBigNum.toNumber() * shareMultiplier;
      blockDiffAdjusted = job.difficulty * shareMultiplier;
      blockHex = job.serializeBlock(headerBuffer, coinbaseBuffer, nonceBuffer, mixHashBuffer).toString('hex');
      if(_this.poolConfig.primary.coin.algorithms.mining === 'kawpow') {
        blockHash = hashOutputBuffer.toString('hex'); 
      } else {
        //Firopow
        const headerBuf = Buffer.alloc(120);
        const MIX_HASH_BUFFER = Buffer.alloc(32);
        headerBuffer.copy(headerBuf);
        merkleRoot.copy(headerBuf,36)
        nonceBuffer.copy(headerBuf, 80);
        utils.reverseBuffer(mixHashBuffer, MIX_HASH_BUFFER).copy(headerBuf, 88);
        blockHash = utils.reverseBuffer(utils.sha256d(headerBuf)).toString('hex');        
      }

      // Check if Share is Valid Block Candidate
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
      shareData = {
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
        identifier: identifier,
        reward: job.rpcData.coinbasevalue,
        shareDiff: shareDiff.toFixed(8),
      };

      auxShareData = {
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
        identifier: identifier,
        shareDiff: shareDiff.toFixed(8),
      };

      _this.emit('share', shareData, auxShareData, blockValid);
      return { error: null, hash: blockHash, hex: blockHex, result: true };

    // Default Share Submission
    /* istanbul ignore next */
    default:

      // Edge Cases to Check if Share is Invalid
      submitTime = Date.now() / 1000 | 0;
      job = _this.validJobs[jobId];
      if (submission.extraNonce2.length / 2 !== _this.extraNonce2Size)
        return shareError([20, 'incorrect size of extranonce2']);
      if (typeof job === 'undefined' || job.jobId != jobId) {
        return shareError([21, 'job not found']);
      }
      if (submission.nTime.length !== 8) {
        return shareError([20, 'incorrect size of ntime']);
      }
      nTimeInt = parseInt(submission.nTime, 16);
      if (nTimeInt < job.rpcData.curtime || nTimeInt > submitTime + 7200) {
        return shareError([20, 'ntime out of range']);
      }
      if (submission.nonce.length !== 8) {
        return shareError([20, 'incorrect size of nonce']);
      }
      if (!addrPrimary && !addrAuxiliary) {
        return shareError([20, 'worker address isn\'t set properly']);
      }
      if (!job.registerSubmit([submission.extraNonce1, submission.extraNonce2, submission.nTime, submission.nonce])) {
        return shareError([22, 'duplicate share']);
      }

      // Check for asicboost Support
      version = job.rpcData.version;
      if (submission.asicboost && submission.versionBit !== undefined) {
        const vBit = parseInt('0x' + submission.versionBit);
        const vMask = parseInt('0x' + submission.versionMask);
        if ((vBit & ~vMask) !== 0) {
          return shareError([20, 'invalid version bit']);
        }
        version = (version & ~vMask) | (vBit & vMask);
      }

      // Establish Share Information
      blockValid = false;
      extraNonce1Buffer = Buffer.from(submission.extraNonce1, 'hex');
      extraNonce2Buffer = Buffer.from(submission.extraNonce2, 'hex');

      // Generate Coinbase Buffer
      coinbaseBuffer = job.serializeCoinbase(extraNonce1Buffer, extraNonce2Buffer);
      coinbaseHash = job.coinbaseHasher(coinbaseBuffer);
      merkleRoot = job.merkle.withFirst(coinbaseHash);

      // Start Generating Block Hash
      headerDigest = Algorithms[algorithm].hash(_this.poolConfig.primary.coin);
      headerBuffer = job.serializeHeader(merkleRoot, submission.nTime, submission.nonce, version);
      headerHash = headerDigest(headerBuffer, nTimeInt);
      headerBigNum = bignum.fromBuffer(headerHash, {endian: 'little', size: 32});

      // Calculate Share Difficulty
      shareDiff = Algorithms[algorithm].diff / headerBigNum.toNumber() * shareMultiplier;
      blockDiffAdjusted = job.difficulty * shareMultiplier;
      blockHex = job.serializeBlock(headerBuffer, coinbaseBuffer, null, null).toString('hex');
      blockHash = job.blockHasher(headerBuffer, submission.nTime).toString('hex');

      // Check if Share is Valid Block Candidate
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
      shareData = {
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
        identifier: identifier,
        reward: job.rpcData.coinbasevalue,
        shareDiff: shareDiff.toFixed(8),
      };

      auxShareData = {
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
        identifier: identifier,
        shareDiff: shareDiff.toFixed(8),
      };

      _this.emit('share', shareData, auxShareData, blockValid);
      return { error: null, hash: blockHash, hex: blockHex, result: true };
    }
  };
};

module.exports = Manager;
Manager.prototype.__proto__ = events.EventEmitter.prototype;
