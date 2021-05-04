/*
 *
 * Manager (Updated)
 *
 */

const events = require('events');
const crypto = require('crypto');
const bignum = require('bignum');
const utils = require('./utils.js');
const Algorithms = require('./algorithms.js');
const BlockTemplate = require('./blocks.js');

// Max Difficulty
const diff1 = 0x00000000ffff0000000000000000000000000000000000000000000000000000;

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

// Generate Unique Job for each BlockTemplate
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
    const shareMultiplier = Algorithms[options.coin.algorithm].multiplier;
    const hashDigest = Algorithms[options.coin.algorithm].hash(options.coin);

    this.currentJob;
    this.validJobs = {};
    this.jobCounter = new JobCounter();
    this.extraNonceCounter = new ExtraNonceCounter(options.instanceId);
    this.extraNoncePlaceholder = Buffer.from('f000000ff111111f', 'hex');
    this.extraNonce2Size = this.extraNoncePlaceholder.length - this.extraNonceCounter.size;

    // Determine Block Hash Function
    function blockHash() {
        switch (options.coin.algorithm) {
        default:
            return function (d) {
                return utils.reverseBuffer(utils.sha256d(d));
            };
        }
    }

    // Determine Coinbase Hash Function
    function coinbaseHash() {
        switch (options.coin.algorithm) {
        default:
            return utils.sha256d;
        }
    }

    this.blockHasher = blockHash();
    this.coinbaseHasher = coinbaseHash();

    // Update Current Managed Job
    this.updateCurrentJob = function(rpcData) {
        const tmpBlockTemplate = new BlockTemplate(
            this.jobCounter.next(),
            Object.assign({}, rpcData),
            _this.extraNoncePlaceholder,
            options
        );
        _this.currentJob = tmpBlockTemplate;
        _this.emit('updatedBlock', tmpBlockTemplate);
        _this.validJobs[tmpBlockTemplate.jobId] = tmpBlockTemplate;
    };

    // Check if New Block is Processed
    this.processTemplate = function(rpcData) {

        // If Current Job !== Previous Job
        let isNewBlock = typeof(_this.currentJob) === 'undefined';
        if ((!isNewBlock && _this.currentJob.rpcData.previousblockhash !== rpcData.previousblockhash) ||
            (!isNewBlock && _this.currentJob.rpcData.bits !== rpcData.bits)) {
            isNewBlock = true;
            if (rpcData.height < _this.currentJob.rpcData.height)
                return false;
        }

        // Check for New Block
        if (!isNewBlock) {
            return false;
        }

        // Update Current Template
        const tmpBlockTemplate = new BlockTemplate(
            this.jobCounter.next(),
            Object.assign({}, rpcData),
            _this.extraNoncePlaceholder,
            options
        );
        _this.currentJob = tmpBlockTemplate;
        _this.emit('newBlock', tmpBlockTemplate);
        _this.validJobs[tmpBlockTemplate.jobId] = tmpBlockTemplate;
        return true;
    };

    // Process New Submitted Share
    this.processShare = function(
        jobId, previousDifficulty, difficulty, extraNonce1, extraNonce2,
        nTime, nonce, ipAddress, port, workerName, versionBit, versionMask,
        asicBoost) {

        // Share is Invalid
        const shareError = function(error) {
            _this.emit('share', {
                job: jobId,
                ip: ipAddress,
                port: port,
                difficulty: difficulty,
                error: error[1],
                worker: workerName,
            });
            return {error: error, result: null};
        };

        let blockHash = null;
        let blockHashInvalid = null;
        let blockHex = null;

        // Edge Cases to Check if Share is Invalid
        const submitTime = Date.now() / 1000 | 0;
        const job = this.validJobs[jobId];
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

        // Check for AsicBoost Support
        let version = job.rpcData.version;
        if (asicBoost && versionBit !== undefined) {
            const vBit = parseInt('0x' + versionBit);
            const vMask = parseInt('0x' + versionMask);
            if ((vBit & ~vMask) !== 0) {
                return shareError([20, 'invalid version bit']);
            }
            version = (version & ~vMask) | (vBit & vMask);
        }

        // Establish Share Information
        const extraNonce1Buffer = Buffer.from(extraNonce1, 'hex');
        const extraNonce2Buffer = Buffer.from(extraNonce2, 'hex');
        const coinbaseBuffer = job.serializeCoinbase(extraNonce1Buffer, extraNonce2Buffer);
        const coinbaseHash = this.coinbaseHasher(coinbaseBuffer);
        const merkleRoot = utils.reverseBuffer(job.merkle.withFirst(coinbaseHash)).toString('hex');

        // Start Generating Block Hash
        const headerBuffer = job.serializeHeader(merkleRoot, nTime, nonce, version);
        const headerHash = hashDigest(headerBuffer, nTimeInt);
        const headerBigNum = bignum.fromBuffer(headerHash, {endian: 'little', size: 32});

        // Calculate Share Difficulty
        const shareDiff = diff1 / headerBigNum.toNumber() * shareMultiplier;
        const blockDiffAdjusted = job.difficulty * shareMultiplier;

        // Check if Share is Valid Block Candidate
        /* istanbul ignore next */
        if (job.target.ge(headerBigNum)) {
            blockHex = job.serializeBlock(headerBuffer, coinbaseBuffer).toString('hex');
            blockHash = this.blockHasher(headerBuffer, nTime).toString('hex');
        } else {
            if (options.settings.emitInvalidBlockHashes) {
                blockHashInvalid = utils.reverseBuffer(utils.sha256d(headerBuffer)).toString('hex');
            }
            if (shareDiff / difficulty < 0.99) {
                if (previousDifficulty && shareDiff >= previousDifficulty) {
                    difficulty = previousDifficulty;
                } else {
                    return shareError([23, 'low difficulty share of ' + shareDiff]);
                }
            }
        }

        _this.emit('share', {
            job: jobId,
            ip: ipAddress,
            port: port,
            blockDiff : blockDiffAdjusted,
            blockDiffActual: job.difficulty,
            difficulty: difficulty,
            hash: blockHash,
            hashInvalid: blockHashInvalid,
            height: job.rpcData.height,
            reward: job.rpcData.coinbasevalue,
            shareDiff: shareDiff.toFixed(8),
            worker: workerName,
        }, blockHex);

        return {
            error: null,
            hash: blockHash,
            hashInvalid: blockHashInvalid,
            hex: blockHex,
            result: true,
        };
    };
};

module.exports = Manager;
Manager.prototype.__proto__ = events.EventEmitter.prototype;
