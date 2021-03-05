/*
 *
 * Blocks (Updated)
 *
 */

// Import Required Modules
let bignum = require('bignum');
let util = require('./util.js');

// Import Required Modules
let Merkle = require('./merkle.js');
let Transactions = require('./transactions.js');

// Max Difficulty
let diff1 = 0x00000000ffff0000000000000000000000000000000000000000000000000000;

// BlockTemplate Main Function
let BlockTemplate = function(jobId, rpcData, extraNoncePlaceholder, options) {

    // Establish Block Variables
    this.submits = [];
    this.rpcData = rpcData;
    this.jobId = jobId;

    // Calculate Block Target/Difficulty
    this.target = this.rpcData.target ? bignum(this.rpcData.target, 16) : util.bignumFromBitsHex(this.rpcData.bits);
    this.difficulty = parseFloat((diff1 / this.target.toNumber()).toFixed(9));

    // Function to get Merkle Hashes
    this.getMerkleHashes = function(steps) {
        return steps.map(function(step) {
            return step.toString('hex');
        });
    }

    // Function to get Transaction Buffers
    this.getTransactionBuffers = function(txs) {
        let txHashes = txs.map(function(tx) {
            if (tx.txid !== undefined) {
                return util.uint256BufferFromHash(tx.txid);
            }
            return util.uint256BufferFromHash(tx.hash);
        });
        return [null].concat(txHashes);
    }

    // Function to get Masternode Vote Data
    this.getVoteData = function() {
        if (!this.rpcData.masternode_payments) {
            return Buffer.from([]);
        }
        return Buffer.concat(
            [util.varIntBuffer(this.rpcData.votes.length)].concat(
                this.rpcData.votes.map(function (vt) {
                    return Buffer.from(vt, 'hex');
                })
            )
        );
    }

    // Create Generation Transaction
    this.createGeneration = function(rpcData, extraNoncePlaceholder, options) {
        let transactions = new Transactions();
        return transactions.bitcoin(rpcData, extraNoncePlaceholder, options);
    }

    // Create Merkle Data
    this.createMerkle = function(rpcData, genTransaction, options) {
        return new Merkle(this.getTransactionBuffers(rpcData.transactions));
    }

    // Establish Generation/Merkle
    this.generation = this.createGeneration(this.rpcData, extraNoncePlaceholder, options);
    this.merkle = this.createMerkle(this.rpcData, this.generation, options);

    // Structure Block Transaction Data
    this.transactions = Buffer.concat(this.rpcData.transactions.map(function(tx) {
        return Buffer.from(tx.data, 'hex');
    }));

    // Structure Block Historical Hashes
    this.prevHashReversed = util.reverseByteOrder(Buffer.from(this.rpcData.previousblockhash, 'hex')).toString('hex');

    // Serialize Block Coinbase
    this.serializeCoinbase = function(extraNonce1, extraNonce2, options) {
        return Buffer.concat([
          this.generation[0][0],
          extraNonce1,
          extraNonce2,
          this.generation[0][1]
        ])
    };

    // Serialize Block Headers
    this.serializeHeader = function(merkleRoot, nTime, nonce, options) {
        let header =  Buffer.alloc(80);
        let position = 0;
        header.write(nonce, position, 4, 'hex');
        header.write(this.rpcData.bits, position += 4, 4, 'hex');
        header.write(nTime, position += 4, 4, 'hex');
        header.write(merkleRoot, position += 4, 32, 'hex');
        header.write(this.rpcData.previousblockhash, position += 32, 32, 'hex');
        header.writeUInt32BE(this.rpcData.version, position + 32);
        header = util.reverseBuffer(header);
        return header;
    };

    // Serialize Entire Block
    this.serializeBlock = function(header, secondary, options) {
        let buffer = Buffer.concat([
            header,
            util.varIntBuffer(this.rpcData.transactions.length + 1),
            secondary,
            this.transactions,
            this.getVoteData(),
            Buffer.from([])
        ]);
        return buffer;
    };

    // Push Submissions to Array
    this.registerSubmit = function(header) {
        let submission = header.join("").toLowerCase();
        if (this.submits.indexOf(submission) === -1) {
            this.submits.push(submission);
            return true;
        }
        return false;
    };

    // Get Current Job Parameters
    this.getJobParams = function(options) {
        if (!this.jobParams) {
            this.jobParams = [
                this.jobId,
                this.prevHashReversed,
                this.generation[0][0].toString('hex'),
                this.generation[0][1].toString('hex'),
                this.getMerkleHashes(this.merkle.steps),
                util.packInt32BE(this.rpcData.version).toString('hex'),
                this.rpcData.bits,
                util.packUInt32BE(this.rpcData.curtime).toString('hex'),
                true
            ];
        }
        return this.jobParams;
    };
};

// Export BlockTemplate
module.exports = BlockTemplate;
