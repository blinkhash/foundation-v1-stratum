/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
var bitcoin = require('blinkhash-utxo-lib')
var util = require('./util.js');

// Generate Combined Transactions (Bitcoin)
var Transactions = function() {

    // Convert Address to Usable Script
    function compileScript(address, network) {
        var outputScript = util.addressToScript(network, address);
        if (address.length === 40) {
            outputScript = util.miningKeyToScript(address);
        }
        return outputScript
    }

    // Structure ZCash Protocol Transaction
    this.zcash = function(rpcData, options) {

        // Establish Transactions Variables [1]
        var feePercent = 0;
        var network = options.coin.network;
        var txBuilder = new bitcoin.TransactionBuilder(network)

        // Establish Transactions Variables [2]
        var reward = rpcData.miner * 1e8;
        var rewardToPool = reward;
        var poolIdentifier = options.identifier || "https://github.com/blinkhash/blinkhash-server"
        var poolAddressScript = util.addressToScript(options.network, options.poolAddress)

        // Set Transaction Version
        if (options.coin.sapling === true || (typeof options.coin.sapling === 'number' && options.coin.sapling <= rpcData.height)) {
            txBuilder.setVersion(bitcoin.Transaction.ZCASH_SAPLING_VERSION);
        } else if (options.coin.overwinter === true || (typeof options.coin.overwinter === 'number' && options.coin.overwinter <= rpcData.height)) {
            txBuilder.setVersion(bitcoin.Transaction.ZCASH_OVERWINTER_VERSION);
        }

        // Serialize Block Height [1]
        var blockHeightSerial = (rpcData.height.toString(16).length % 2 === 0 ? '' : '0') + rpcData.height.toString(16)
        let height = Math.ceil((rpcData.height << 1).toString(2).length / 8)
        let lengthDiff = blockHeightSerial.length / 2 - height
        for (let i = 0; i < lengthDiff; i++) {
            blockHeightSerial = `${blockHeightSerial}00`
        }

        // Serialize Block Height [2]
        let length = `0${height}`
        let serializedBlockHeight = new Buffer.concat([
            new Buffer(length, 'hex'),
            util.reverseBuffer(new Buffer(blockHeightSerial, 'hex')),
            new Buffer('00', 'hex')
        ])

        // Add Serialized Block Height to Transaction
        txBuilder.addInput(new Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
            4294967295,
            4294967295,
            new Buffer.concat([
                serializedBlockHeight,
                Buffer.from(Buffer.from(poolIdentifier, "utf8").toString("hex"), "hex")
            ])
        )

        // Calculate Recipient Fees
        for (var i = 0; i < options.recipients.length; i++) {
            feePercent += options.recipients[i].percent;
        }

        // Handle Pool/Secondary Transactions
        switch (options.rewards.rewardType) {

            // Founder Rewards Configuration [1]
            case "equihash-rewards1":

                // Calculate Indices/Rewards
                var treasuryIndex = parseInt(Math.floor(((rpcData.height - options.rewards.treasury.startHeight) / options.rewards.treasury.interval) % options.rewards.treasury.recipients.length))
                var secureNodesIndex = parseInt(Math.floor(((rpcData.height - options.rewards.secureNodes.startHeight) / options.rewards.secureNodes.interval) % options.rewards.secureNodes.recipients.length))
                var superNodesIndex = parseInt(Math.floor(((rpcData.height - options.rewards.superNodes.startHeight) / options.rewards.superNodes.interval) % options.rewards.superNodes.recipients.length))
                var secondaryReward = (options.rewards.treasury.reward + options.rewards.secureNodes.reward + options.rewards.superNodes.reward) / 100
                var poolReward = Math.floor(reward * (1 - (secondaryReward + feePercent)));

                // Generate Address Scripts
                var treasuryScript = compileScript(options.rewards.treasury.recipients[treasuryIndex], options.network);
                var secureNodesScript = compileScript(options.rewards.secureNodes.recipients[secureNodesIndex], options.network);
                var superNodesScript = compileScript(options.rewards.superNodes.recipients[superNodesIndex], options.network);

                // Add Transaction Data to Block
                txBuilder.addOutput(poolAddressScript, poolReward);
                if ((rpcData.height >= options.rewards.treasury.startHeight) && (rpcData.height <= options.rewards.treasury.endHeight)) {
                    txBuilder.addOutput(treasuryScript, options.rewards.treasury.reward / 100);
                }
                if ((rpcData.height >= options.rewards.secureNodes.startHeight) && (rpcData.height <= options.rewards.secureNodes.endHeight)) {
                    txBuilder.addOutput(secureNodesScript, options.rewards.secureNodes.reward / 100);
                }
                if ((rpcData.height >= options.rewards.superNodes.startHeight) && (rpcData.height <= options.rewards.superNodes.endHeight)) {
                    txBuilder.addOutput(superNodesScript, options.rewards.superNodes.reward / 100);
                }
                break;

            // Founder Rewards Configuration [2]
            case "equihash-rewards2":

                // Calculate Indices/Rewards
                var treasuryIndex = parseInt(Math.floor(((rpcData.height - options.rewards.treasury.startHeight) / options.rewards.treasury.interval) % options.rewards.treasury.recipients.length))
                var secondaryReward = (options.rewards.treasury.reward) / 100
                var poolReward = Math.floor(reward * (1 - (secondaryReward + feePercent)));

                // Generate Address Scripts
                var treasuryScript = compileScript(options.rewards.treasury.recipients[treasuryIndex], options.network);

                // Add Transaction Data to Block
                txBuilder.addOutput(poolAddressScript, poolReward);
                if ((rpcData.height >= options.rewards.treasury.startHeight) && (rpcData.height <= options.rewards.treasury.endHeight)) {
                    txBuilder.addOutput(treasuryScript, options.rewards.treasury.reward / 100);
                }
                break;

            // Founder Rewards Configuration [3]
            case "equihash-rewards3":

                // Calculate Indices/Rewards
                var foundersIndex = parseInt(Math.floor(((rpcData.height - options.rewards.founders.startHeight) / options.rewards.founders.interval) % options.rewards.founders.recipients.length))
                var secondaryReward = (options.rewards.founders.reward) / 100
                var poolReward = Math.floor(reward * (1 - (secondaryReward + feePercent)));

                // Generate Address Scripts
                var foundersScript = compileScript(options.rewards.founders.recipients[foundersIndex], options.network);

                // Add Transaction Data to Block
                txBuilder.addOutput(poolAddressScript, poolReward);
                if ((rpcData.height >= options.rewards.founders.startHeight) && (rpcData.height <= options.rewards.founders.endHeight)) {
                    txBuilder.addOutput(foundersScript, options.rewards.founders.reward / 100);
                }
                break;

            // No Founder Rewards
            default:
                var poolReward = reward * (1 - feePercent);
                txBuilder.addOutput(poolAddressScript, poolReward);
                break;
        }

        // Handle Block Transactions
        for (var i = 0; i < options.recipients.length; i++) {
            var recipientScript = compileScript(options.recipients[i].address, options.network);
            txBuilder.addOutput(recipientScript, reward * options.recipients[i].percent);
        }

        // Finalize Transaction
        var generation = txBuilder.build()
        var txHex = generation.toHex();
        var txHash = generation.getHash().toString('hex');

        // Return Generated Transaction
        return [txHex, txHash]
    }

    // Structure Bitcoin Protocol Transaction
    this.bitcoin = function(rpcData, extraNoncePlaceholder, options) {

        // Establish Transactions Variables [1]
        var txLockTime = 0;
        var txInSequence = 0;
        var txType = 0;
        var txExtraPayload;
        var txInPrevOutHash = "";
        var txInPrevOutIndex = Math.pow(2, 32) - 1;
        var txOutputBuffers = [];
        var txVersion = options.coin.txMessages === true ? 2 : 1;
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
        var reward = rpcData.coinbasevalue;
        var rewardToPool = reward;
        var poolIdentifier = options.identifier || "https://github.com/blinkhash/blinkhash-server"
        var poolAddressScript = util.addressToScript(options.network, options.poolAddress)
        var coinbaseAux = rpcData.coinbaseaux.flags ? Buffer.from(rpcData.coinbaseaux.flags, 'hex') : Buffer.from([]);

        // Handle Comments if Necessary
        var txComment = options.coin.txMessages === true ?
            util.serializeString(poolIdentifier) :
            Buffer.from([]);

        // Handle ScriptSig [1]
        var scriptSigPart1 = Buffer.concat([
            util.serializeNumber(rpcData.height),
            coinbaseAux,
            util.serializeNumber(Date.now() / 1000 | 0),
            Buffer.from([extraNoncePlaceholder.length])
        ]);

        // Handle ScriptSig [2]
        var scriptSigPart2 = util.serializeString(poolIdentifier);

        // Combine Transaction [1]
        var p1 = Buffer.concat([
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
                var payeeReward = rpcData.masternode.amount;
                var payeeScript = compileScript(rpcData.masternode.payee, options.network);
                reward -= payeeReward;
                rewardToPool -= payeeReward;
                txOutputBuffers.push(Buffer.concat([
                    util.packInt64LE(payeeReward),
                    util.varIntBuffer(payeeScript.length),
                    payeeScript,
                ]));
            }
            else if (rpcData.masternode.length > 0) {
                for (var i in rpcData.masternode) {
                    var payeeReward = rpcData.masternode[i].amount;
                    var payeeScript;
                    if (rpcData.masternode[i].script) {
                        payeeScript = Buffer.from(rpcData.masternode[i].script, 'hex')
                    }
                    else {
                        compileScript(rpcData.masternode[i].payee, options.network);
                    }
                    reward -= payeeReward;
                    rewardToPool -= payeeReward;
                    txOutputBuffers.push(Buffer.concat([
                        util.packInt64LE(payeeReward),
                        util.varIntBuffer(payeeScript.length),
                        payeeScript,
                    ]));
                }
            }
        }

        // Handle Superblocks
        if (rpcData.superblock && rpcData.superblock.length > 0) {
            for (var i in rpcData.superblock) {
                var payeeReward = rpcData.superblock[i].amount;
                var payeeScript;
                if (rpcData.superblock[i].script) {
                    payeeScript = Buffer.from(rpcData.superblock[i].script, 'hex')
                }
                else {
                    compileScript(rpcData.superblock[i].payee, options.network);
                }
                reward -= payeeReward;
                rewardToPool -= payeeReward;
                txOutputBuffers.push(Buffer.concat([
                    util.packInt64LE(payeeReward),
                    util.varIntBuffer(payeeScript.length),
                    payeeScript
                ]));
            }
        }

        // Handle Other Given Payees
        if (rpcData.payee) {
            var payeeReward = rpcData.payee_amount || Math.ceil(reward / 5);
            var payeeScript = compileScript(rpcData.payee, options.network);
            reward -= payeeReward;
            rewardToPool -= payeeReward;
            txOutputBuffers.push(Buffer.concat([
                util.packInt64LE(payeeReward),
                util.varIntBuffer(payeeScript.length),
                payeeScript,
            ]));
        }

        // Handle Pool/Secondary Transactions
        switch (options.rewards.rewardType) {

            // No Founder Rewards
            default:
                break;
        }

        // Handle Block Transactions
        for (var i = 0; i < options.recipients.length; i++) {
            var recipientReward = Math.floor(options.recipients[i].percent * reward);
            var recipientScript = compileScript(options.recipients[i].address, options.network);
            reward -= payeeReward;
            rewardToPool -= recipientReward;
            txOutputBuffers.push(Buffer.concat([
                util.packInt64LE(recipientReward),
                util.varIntBuffer(recipientScript.length),
                recipientScript,
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

        // Check for Extra Transaction Payload
        if (txExtraPayload !== undefined) {
            var p2 = Buffer.concat([
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
