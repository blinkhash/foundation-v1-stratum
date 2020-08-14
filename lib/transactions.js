/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
var util = require('./util.js');

// Generate Output Transactions
var generateOutputTransactions = function(poolRecipient, recipients, rpcData, network) {

    var reward = rpcData.coinbasevalue;
    var rewardToPool = reward;
    var txOutputBuffers = [];

    // Handle Masternode + Superblock Transactions
    if (rpcData.masternode && rpcData.superblock) {

        // If Masternode Payee Exists
        if (rpcData.masternode.payee) {
            var payeeReward = 0;
            payeeReward = rpcData.masternode.amount;
            reward -= payeeReward;
            rewardToPool -= payeeReward;
            var payeeScript = util.addressToScript(network, rpcData.masternode.payee);
            txOutputBuffers.push(Buffer.concat([
                util.packInt64LE(payeeReward),
                util.varIntBuffer(payeeScript.length),
                payeeScript
            ]));
        }

        // If the Block is a SuperBlock
        else if (rpcData.superblock.length > 0) {
            for (var i in rpcData.superblock) {
                var payeeReward = 0;
                payeeReward = rpcData.superblock[i].amount;
                reward -= payeeReward;
                rewardToPool -= payeeReward;
                var payeeScript = util.addressToScript(network, rpcData.superblock[i].payee);
                txOutputBuffers.push(Buffer.concat([
                    util.packInt64LE(payeeReward),
                    util.varIntBuffer(payeeScript.length),
                    payeeScript
                ]));
            }
        }
    }

    // Handle Block Payee
    if (rpcData.payee) {
        var payeeReward = 0;
        if (rpcData.payee_amount) {
            payeeReward = rpcData.payee_amount;
        }
        else {
            payeeReward = Math.ceil(reward / 5);
        }
        reward -= payeeReward;
        rewardToPool -= payeeReward;
        var payeeScript = util.addressToScript(network, rpcData.payee);
        txOutputBuffers.push(Buffer.concat([
            util.packInt64LE(payeeReward),
            util.varIntBuffer(payeeScript.length),
            payeeScript
        ]));
    }

    // Handle Block Transactions
    for (var i = 0; i < recipients.length; i++) {
        var recipientReward = Math.floor(recipients[i].percent * reward);
        rewardToPool -= recipientReward;
        txOutputBuffers.push(Buffer.concat([
            util.packInt64LE(recipientReward),
            util.varIntBuffer(recipients[i].script.length),
            recipients[i].script
        ]));
    }

    // Handle Pool Transaction
    txOutputBuffers.unshift(Buffer.concat([
        util.packInt64LE(rewardToPool),
        util.varIntBuffer(poolRecipient.length),
        poolRecipient
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
    return Buffer.concat([
        util.varIntBuffer(txOutputBuffers.length),
        Buffer.concat(txOutputBuffers)
    ]);
};

// Generate Combined Transactions
var createGeneration = function(rpcData, publicKey, extraNoncePlaceholder, reward, txMessages, recipients, network) {

    // Establish Transactions Variables
    var txInputsCount = 1;
    var txOutputsCount = 1;
    var txVersion = txMessages === true ? 2 : 1;
    var txLockTime = 0;
    var txInPrevOutHash = "";
    var txInPrevOutIndex = Math.pow(2, 32) - 1;
    var txInSequence = 0;

    // Handle PoS Transaction if Necessary
    var txTimestamp = reward === 'POS' ?
        util.packUInt32LE(rpcData.curtime) : Buffer.from([]);

    // Handle Comments if Necessary
    var txComment = txMessages === true ?
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
        txTimestamp,
        util.varIntBuffer(txInputsCount),
        util.uint256BufferFromHash(txInPrevOutHash),
        util.packUInt32LE(txInPrevOutIndex),
        util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
        scriptSigPart1
    ]);

    /*
    The generation transaction must be split at the extranonce (which located in the transaction input
    scriptSig). Miners send us unique extranonces that we use to join the two parts in attempt to create
    a valid share and/or block.
     */

    // Generate Output Transactions
    var outputTransactions = generateOutputTransactions(publicKey, recipients, rpcData, network);

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
};

// Export Transactions
exports.createGeneration = createGeneration;
