/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
var util = require('./util.js');

// Generate Combined Transactions (Bitcoin)
var Transactions = function() {

    // Structure Bitcoin Protocol Transaction
    this.bitcoin = function(rpcData, extraNoncePlaceholder, options) {

        // Establish Transactions Variables [1]
        var txLockTime = 0;
        var txInSequence = 0;
        var txInPrevOutHash = "";
        var txInPrevOutIndex = Math.pow(2, 32) - 1;
        var txVersion = options.coin.txMessages === true ? 2 : 1;

        // Establish Transactions Variables [2]
        var reward = rpcData.coinbasevalue;
        var rewardToPool = reward;
        var txOutputBuffers = [];

        // Convert Address to Script
        var poolAddressScript = util.addressToScript(options.network, options.poolAddress)

        // Handle Comments if Necessary
        var txComment = options.coin.txMessages === true ?
            util.serializeString('https://github.com/blinkhash/blinkhash-stratum-pool') :
            Buffer.from([]);

        // Handle ScriptSig [1]
        var scriptSigPart1 = Buffer.concat([
            util.serializeNumber(rpcData.height),
            Buffer.from(rpcData.coinbaseaux.flags, 'hex'),
            util.serializeNumber(Date.now() / 1000 | 0),
            Buffer.from([extraNoncePlaceholder.length])
        ]);

        // Handle ScriptSig [2]
        var scriptSigPart2 = util.serializeString('/blinkhash-stratum-pool/');

        // Combine Transaction [1]
        var p1 = Buffer.concat([
            util.packUInt32LE(txVersion),
            util.varIntBuffer(1),
            util.uint256BufferFromHash(txInPrevOutHash),
            util.packUInt32LE(txInPrevOutIndex),
            util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
            scriptSigPart1
        ]);

        // Handle Block Transactions
        for (var i = 0; i < options.recipients.length; i++) {
            var recipientReward = Math.floor(options.recipients[i].percent * reward);
            rewardToPool -= recipientReward;
            txOutputBuffers.push(Buffer.concat([
                util.packInt64LE(recipientReward),
                util.varIntBuffer(options.recipients[i].script.length),
                options.recipients[i].script
            ]));
        }

        // Handle Pool Transaction
        txOutputBuffers.unshift(Buffer.concat([
            util.packInt64LE(rewardToPool),
            util.varIntBuffer(poolAddressScript.length),
            poolAddressScript
        ]));

        // Handle Witness Commitment
        if (rpcData.default_witness_commitment !== undefined) {
            witness_commitment = Buffer.from(rpcData.default_witness_commitment, 'hex');
            txOutputBuffers.unshift(Buffer.concat([
                util.packInt64LE(0),
                util.varIntBuffer(witness_commitment.length),
                witness_commitment
            ]));
        }

        // Combine All Transactions
        var outputTransactions = Buffer.concat([
            util.varIntBuffer(txOutputBuffers.length),
            Buffer.concat(txOutputBuffers)
        ]);

        // Combine Transaction [2]
        var p2 = Buffer.concat([
            scriptSigPart2,
            util.packUInt32LE(txInSequence),
            outputTransactions,
            util.packUInt32LE(txLockTime),
            txComment
        ]);

        // Return Generated Transaction
        return [p1, p2];
    }
};

// Export Transactions
module.exports = Transactions;
