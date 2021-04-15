/*
 *
 * Blocks (Updated)
 *
 */

// Import Required Modules
const bignum = require('bignum');
const utils = require('./utils.js');

// Import Required Modules
const Merkle = require('./merkle.js');
const Transactions = require('./transactions.js');

// Max Difficulty
const diff1 = 0x00000000ffff0000000000000000000000000000000000000000000000000000;

// BlockTemplate Main Function
const BlockTemplate = function(jobId, rpcData, extraNoncePlaceholder, options) {

    // Establish Block Variables
    this.submits = [];
    this.rpcData = rpcData;
    this.jobId = jobId;

    // Calculate Block Target/Difficulty
    this.target = this.rpcData.target ? bignum(this.rpcData.target, 16) : utils.bignumFromBitsHex(this.rpcData.bits);
    this.difficulty = parseFloat((diff1 / this.target.toNumber()).toFixed(9));

    // Function to get Merkle Hashes
    this.getMerkleHashes = function(steps) {
        return steps.map(function(step) {
            return step.toString('hex');
        });
    };

    // Function to get Transaction Buffers
    this.getTransactionBuffers = function(txs) {
        const txHashes = txs.map(function(tx) {
            if (tx.txid !== undefined) {
                return utils.uint256BufferFromHash(tx.txid);
            }
            return utils.uint256BufferFromHash(tx.hash);
        });
        return [null].concat(txHashes);
    };

    // Function to get Masternode Vote Data
    this.getVoteData = function() {
        if (!this.rpcData.masternode_payments) {
            return Buffer.from([]);
        }
        return Buffer.concat(
            [utils.varIntBuffer(this.rpcData.votes.length)].concat(
                this.rpcData.votes.map(function (vt) {
                    return Buffer.from(vt, 'hex');
                })
            )
        );
    };

    // Create Generation Transaction
    this.createGeneration = function(rpcData, extraNoncePlaceholder, options) {
        const transactions = new Transactions();
        return transactions.bitcoin(rpcData, extraNoncePlaceholder, options);
    };

    // Create Merkle Data
    this.createMerkle = function(rpcData) {
        return new Merkle(this.getTransactionBuffers(rpcData.transactions));
    };

    // Establish Generation/Merkle
    this.generation = this.createGeneration(this.rpcData, extraNoncePlaceholder, options);
    this.merkle = this.createMerkle(this.rpcData);

    // Structure Block Transaction Data
    this.transactions = Buffer.concat(this.rpcData.transactions.map(function(tx) {
        return Buffer.from(tx.data, 'hex');
    }));

    // Structure Block Historical Hashes
    this.prevHashReversed = utils.reverseByteOrder(Buffer.from(this.rpcData.previousblockhash, 'hex')).toString('hex');

    // Serialize Block Coinbase
    this.serializeCoinbase = function(extraNonce1, extraNonce2) {
        return Buffer.concat([
            this.generation[0],
            extraNonce1,
            extraNonce2,
            this.generation[1]
        ]);
    };

    // Serialize Block Headers
    this.serializeHeader = function(merkleRoot, nTime, nonce) {
        let header = Buffer.alloc(80);
        let position = 0;
        header.write(nonce, position, 4, 'hex');
        header.write(this.rpcData.bits, position += 4, 4, 'hex');
        header.write(nTime, position += 4, 4, 'hex');
        header.write(merkleRoot, position += 4, 32, 'hex');
        header.write(this.rpcData.previousblockhash, position += 32, 32, 'hex');
        header.writeUInt32BE(this.rpcData.version, position + 32);
        header = utils.reverseBuffer(header);
        return header;
    };

    // Serialize Entire Block
    this.serializeBlock = function(header, secondary) {
        const buffer = Buffer.concat([
            header,
            utils.varIntBuffer(this.rpcData.transactions.length + 1),
            secondary,
            this.transactions,
            this.getVoteData(),
            Buffer.from([])
        ]);
        return buffer;
    };

    // Push Submissions to Array
    this.registerSubmit = function(header) {
        const submission = header.join("").toLowerCase();
        if (this.submits.indexOf(submission) === -1) {
            this.submits.push(submission);
            return true;
        }
        return false;
    };

    // Get Current Job Parameters
    this.getJobParams = function() {
        if (!this.jobParams) {
            this.jobParams = [
                this.jobId,
                this.prevHashReversed,
                this.generation[0].toString('hex'),
                this.generation[1].toString('hex'),
                this.getMerkleHashes(this.merkle.steps),
                utils.packInt32BE(this.rpcData.version).toString('hex'),
                this.rpcData.bits,
                utils.packUInt32BE(this.rpcData.curtime).toString('hex'),
                true
            ];
        }
        return this.jobParams;
    };
};

// Export BlockTemplate
module.exports = BlockTemplate;
