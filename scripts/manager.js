/*
 *
 * Manager (Updated)
 *
 */

// Import Required Modules
var events = require('events');
var crypto = require('crypto');
var bignum = require('bignum');
var util = require('./util.js');

// Import BlockTemplate Module
var BlockTemplate = require('./blocks.js');

// Generate Unique ExtraNonce for each Subscriber
var ExtraNonceCounter = function(configInstanceId) {
    var instanceId = configInstanceId || crypto.randomBytes(4).readUInt32LE(0);
    var counter = instanceId << 27;
    this.size = 4;
    this.next = function() {
        var extraNonce = util.packUInt32BE(Math.abs(counter++));
        return extraNonce.toString('hex');
    };
};

// Generate Unique Job for each BlockTemplate
var JobCounter = function() {
    var counter = 0;
    this.next = function() {
        counter++;
        if (counter % 0xffff === 0)
            counter = 1;
        return this.cur();
    };
    this.cur = function() {
        return counter.toString(16);
    };
};

/**
 * Emits:
 * - newBlock(BlockTemplate) - When a new block (previously unknown to the JobManager) is added, use this event to broadcast new jobs
 * - share(shareData, blockHex) - When a worker submits a share. It will have blockHex if a block was found
**/

// Manager Main Function
var Manager = function(options) {

    // Establish Private Manager Variables
    var _this = this;
    var jobCounter = new JobCounter();
    var shareMultiplier = algorithms[options.coin.algorithm].multiplier;
    var hashDigest = algorithms[options.coin.algorithm].hash(options.coin);

    // Establish Public Manager Variables
    this.currentJob;
    this.validJobs = {};
    this.extraNonceCounter = new ExtraNonceCounter(options.instanceId);
    this.extraNoncePlaceholder = Buffer.from('f000000ff111111f', 'hex');
    this.extraNonce2Size = this.extraNoncePlaceholder.length - this.extraNonceCounter.size;

    // Determine Block Hash Function
    function blockHash() {
        switch (options.coin.algorithm) {
            default:
                return function (d) {
                    return util.reverseBuffer(util.sha256d(d));
                };
        }
    }

    // Determine Coinbase Hash Function
    function coinbaseHash() {
        switch(options.coin.algorithm) {
            default:
                return util.sha256d;
        }
    }

    // Establish Main Hash Functions
    var blockHasher = blockHash();
    var coinbaseHasher = coinbaseHash();

    // Update Current Managed Job
    function updateCurrentJob(rpcData) {
        var tmpBlockTemplate = new BlockTemplate(
            jobCounter.next(),
            rpcData,
            _this.extraNoncePlaceholder,
            options
        );
        _this.currentJob = tmpBlockTemplate;
        _this.emit('updatedBlock', tmpBlockTemplate, true);
        _this.validJobs[tmpBlockTemplate.jobId] = tmpBlockTemplate;
    }

    // Check if New Block is Processed
    this.updateCurrentJob = updateCurrentJob
    this.processTemplate = function(rpcData) {

        // If Current Job !== Previous Job
        var isNewBlock = typeof(_this.currentJob) === 'undefined';
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

        // Update Current Managed Block
        updateCurrentJob(rpcData)
        return true;
    };

    // Process New Submitted Share
    this.processShare = function(jobId, previousDifficulty, difficulty, extraNonce1, extraNonce2, nTime, nonce, ipAddress, port, workerName) {

        // Share is Invalid
        var shareError = function(error) {
            _this.emit('share', {
                job: jobId,
                ip: ipAddress,
                worker: workerName,
                difficulty: difficulty,
                port: port,
                error: error[1]
            });
            return {error: error, result: null};
        };

        // Handle Shares by Algorithm
        switch (options.coin.algorithm) {

            // Default Share Handling
            default:

                // Edge Cases to Check if Share is Invalid
                var submitTime = Date.now() / 1000 | 0;
                if (extraNonce2.length / 2 !== _this.extraNonce2Size)
                    return shareError([20, 'incorrect size of extranonce2']);
                var job = this.validJobs[jobId];
                if (typeof job === 'undefined' || job.jobId != jobId ) {
                    return shareError([21, 'job not found']);
                }
                if (nTime.length !== 8) {
                    return shareError([20, 'incorrect size of ntime']);
                }
                var nTimeInt = parseInt(nTime, 16);
                if (nTimeInt < job.rpcData.curtime || nTimeInt > submitTime + 7200) {
                    return shareError([20, 'ntime out of range']);
                }
                if (nonce.length !== 8) {
                    return shareError([20, 'incorrect size of nonce']);
                }
                if (!job.registerSubmit(extraNonce1, extraNonce2, nTime, nonce)) {
                    return shareError([22, 'duplicate share']);
                }

                // Establish Share Information
                var extraNonce1Buffer = Buffer.from(extraNonce1, 'hex');
                var extraNonce2Buffer = Buffer.from(extraNonce2, 'hex');
                var coinbaseBuffer = job.serializeCoinbase(extraNonce1Buffer, extraNonce2Buffer, options);
                var coinbaseHash = coinbaseHasher(coinbaseBuffer);
                var merkleRoot = util.reverseBuffer(job.merkleTree.withFirst(coinbaseHash)).toString('hex');
                var headerBuffer = job.serializeHeader(merkleRoot, nTime, nonce, options);
                var headerHash = hashDigest(headerBuffer, nTimeInt);
                var headerBigNum = bignum.fromBuffer(headerHash, {endian: 'little', size: 32});

                // Establish Share Variables
                var blockHashInvalid;
                var blockHash;
                var blockHex;

                // Calculate Share Difficulty
                var shareDiff = diff1 / headerBigNum.toNumber() * shareMultiplier;
                var blockDiffAdjusted = job.difficulty * shareMultiplier;

                // Check if Share is Valid Block Candidate
                if (job.target.ge(headerBigNum)) {
                    blockHex = job.serializeBlock(headerBuffer, coinbaseBuffer, options).toString('hex');
                    blockHash = blockHasher(headerBuffer, nTime).toString('hex');
                }
                else {
                    if (options.emitInvalidBlockHashes) {
                        blockHashInvalid = util.reverseBuffer(util.sha256d(headerBuffer)).toString('hex');
                    }
                    if (shareDiff / difficulty < 0.99) {
                        if (previousDifficulty && shareDiff >= previousDifficulty) {
                            difficulty = previousDifficulty;
                        }
                        else {
                            return shareError([23, 'low difficulty share of ' + shareDiff]);
                        }
                    }
                }

                // Share is Valid
                _this.emit('share', {
                    job: jobId,
                    ip: ipAddress,
                    port: port,
                    worker: workerName,
                    height: job.rpcData.height,
                    blockReward: job.rpcData.coinbasevalue,
                    difficulty: difficulty,
                    shareDiff: shareDiff.toFixed(8),
                    blockDiff : blockDiffAdjusted,
                    blockDiffActual: job.difficulty,
                    blockHash: blockHash,
                    blockHashInvalid: blockHashInvalid
                }, blockHex);

                // Return Valid Share
                return {result: true, error: null, blockHash: blockHash};
        }
    };
};

// Export Manager
module.exports = Manager;
Manager.prototype.__proto__ = events.EventEmitter.prototype;
