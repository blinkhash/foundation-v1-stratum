/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
let bitcoin = require('blinkhash-utxo-lib')
let util = require('./util.js');

// Generate Combined Transactions (Bitcoin)
let Transactions = function() {

    // Structure Bitcoin Protocol Transaction
    this.bitcoin = function(rpcData, extraNoncePlaceholder, options) {

        // Establish Transactions Variables [1]
        let txLockTime = 0;
        let txInSequence = 0;
        let txType = 0;
        let txExtraPayload;
        let txInPrevOutHash = "";
        let txInPrevOutIndex = Math.pow(2, 32) - 1;
        let txOutputBuffers = [];
        let txVersion = options.coin.txMessages === true ? 2 : 1;
        if (rpcData.coinbasetxn && rpcData.coinbasetxn.data) {
            txVersion = parseInt(util.reverseHex(rpcData.coinbasetxn.data.slice(0, 8)), 16);
        }

        // Support Coinbase v3 Block Template
        if (rpcData.coinbase_payload && rpcData.coinbase_payload.length > 0) {
            txVersion = 3;
            txType = 5;
            txExtraPayload = new Buffer(rpcData.coinbase_payload, 'hex');
        }
        if (!(rpcData.coinbasetxn && rpcData.coinbasetxn.data)) {
            txVersion = txVersion + (txType << 16);
        }

        // Establish Transactions Variables [2]
        let reward = rpcData.coinbasevalue;
        let rewardToPool = reward;
        let poolIdentifier = options.identifier || "https://github.com/blinkhash/blinkhash-server"
        let poolAddressScript = util.addressToScript(options.poolAddress, options.network)
        let coinbaseAux = rpcData.coinbaseaux.flags ? Buffer.from(rpcData.coinbaseaux.flags, 'hex') : Buffer.from([]);

        // Handle Comments if Necessary
        let txComment = options.coin.txMessages === true ?
            util.serializeString(poolIdentifier) :
            Buffer.from([]);

        // Handle ScriptSig [1]
        let scriptSigPart1 = Buffer.concat([
            util.serializeNumber(rpcData.height),
            coinbaseAux,
            util.serializeNumber(Date.now() / 1000 | 0),
            Buffer.from([extraNoncePlaceholder.length])
        ]);

        // Handle ScriptSig [2]
        let scriptSigPart2 = util.serializeString(poolIdentifier);

        // Combine Transaction [1]
        let p1 = Buffer.concat([
            util.packUInt32LE(txVersion),
            util.varIntBuffer(1),
            util.uint256BufferFromHash(txInPrevOutHash),
            util.packUInt32LE(txInPrevOutIndex),
            util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
            scriptSigPart1
        ]);

        // Handle Masternodes
        if (rpcData.masternode) {
            if (rpcData.masternode.payee) {
                let payeeReward = rpcData.masternode.amount;
                let payeeScript = util.addressToScript(rpcData.masternode.payee, options.network);
                reward -= payeeReward;
                rewardToPool -= payeeReward;
                txOutputBuffers.push(Buffer.concat([
                    util.packUInt64LE(payeeReward),
                    util.varIntBuffer(payeeScript.length),
                    payeeScript,
                ]));
            }
            else if (rpcData.masternode.length > 0) {
                for (let i in rpcData.masternode) {
                    let payeeReward = rpcData.masternode[i].amount;
                    let payeeScript;
                    if (rpcData.masternode[i].script) {
                        payeeScript = Buffer.from(rpcData.masternode[i].script, 'hex')
                    }
                    else {
                        util.addressToScript(rpcData.masternode[i].payee, options.network);
                    }
                    reward -= payeeReward;
                    rewardToPool -= payeeReward;
                    txOutputBuffers.push(Buffer.concat([
                        util.packUInt64LE(payeeReward),
                        util.varIntBuffer(payeeScript.length),
                        payeeScript,
                    ]));
                }
            }
        }

        // Handle Superblocks
        if (rpcData.superblock && rpcData.superblock.length > 0) {
            for (let i in rpcData.superblock) {
                let payeeReward = rpcData.superblock[i].amount;
                let payeeScript;
                if (rpcData.superblock[i].script) {
                    payeeScript = Buffer.from(rpcData.superblock[i].script, 'hex')
                }
                else {
                    util.addressToScript(rpcData.superblock[i].payee, options.network);
                }
                reward -= payeeReward;
                rewardToPool -= payeeReward;
                txOutputBuffers.push(Buffer.concat([
                    util.packUInt64LE(payeeReward),
                    util.varIntBuffer(payeeScript.length),
                    payeeScript
                ]));
            }
        }

        // Handle Other Given Payees
        if (rpcData.payee) {
            let payeeReward = rpcData.payee_amount || Math.ceil(reward / 5);
            let payeeScript = util.addressToScript(rpcData.payee, options.network);
            reward -= payeeReward;
            rewardToPool -= payeeReward;
            txOutputBuffers.push(Buffer.concat([
                util.packUInt64LE(payeeReward),
                util.varIntBuffer(payeeScript.length),
                payeeScript,
            ]));
        }

        // Handle Secondary Transactions
        switch (options.rewards.rewardType) {

            // No Founder Rewards
            default:
                break;
        }

        // Handle Recipient Transactions
        for (let i = 0; i < options.recipients.length; i++) {
            let recipientReward = Math.floor(options.recipients[i].percent * reward);
            let recipientScript = util.addressToScript(options.recipients[i].address, options.network);
            reward -= payeeReward;
            rewardToPool -= recipientReward;
            txOutputBuffers.push(Buffer.concat([
                util.packUInt64LE(recipientReward),
                util.varIntBuffer(recipientScript.length),
                recipientScript,
            ]));
        }

        // Handle Pool Transaction
        txOutputBuffers.unshift(Buffer.concat([
            util.packUInt64LE(rewardToPool),
            util.varIntBuffer(poolAddressScript.length),
            poolAddressScript
        ]));

        // Handle Witness Commitment
        if (rpcData.default_witness_commitment !== undefined) {
            witness_commitment = Buffer.from(rpcData.default_witness_commitment, 'hex');
            txOutputBuffers.unshift(Buffer.concat([
                util.packUInt64LE(0),
                util.varIntBuffer(witness_commitment.length),
                witness_commitment
            ]));
        }

        // Combine All Transactions
        let outputTransactions = Buffer.concat([
            util.varIntBuffer(txOutputBuffers.length),
            Buffer.concat(txOutputBuffers)
        ]);

        // Combine Transaction [2]
        let p2 = Buffer.concat([
            scriptSigPart2,
            util.packUInt32LE(txInSequence),
            outputTransactions,
            util.packUInt32LE(txLockTime),
            txComment
        ]);

        // Check for Extra Transaction Payload
        if (txExtraPayload !== undefined) {
            let p2 = Buffer.concat([
                p2,
                util.varIntBuffer(txExtraPayload.length),
                txExtraPayload
            ]);
        }

        // Return Generated Transaction
        return [[p1, p2], null];
    }
};

// Export Transactions
module.exports = Transactions;
