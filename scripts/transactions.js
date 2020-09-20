/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
var bitcoin = require('blinkhash-utxo-lib')
var util = require('./util.js');

// Compile Script w/ Opcodes
function scriptCompile(addrHash) {
    return bitcoin.script.compile([
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,
        addrHash,
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG
    ])
}

// Generate Combined Transactions (Bitcoin)
var Transactions = function() {

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
            txb.setVersion(bitcoin.Transaction.ZCASH_SAPLING_VERSION);
        } else if (options.coin.overwinter === true || (typeof options.coin.overwinter === 'number' && options.coin.overwinter <= rpcData.height)) {
            txb.setVersion(bitcoin.Transaction.ZCASH_OVERWINTER_VERSION);
        }

        // Serialize Block Height [1]
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
        txb.addInput(new Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
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

        // Handle Block Transactions
        txb.addOutput(poolAddressScript, reward * (1 - feePercent));
        for (var i = 0; i < options.recipients.length; i++) {
            var recipientScript = util.addressToScript(options.network, options.recipients[i].address);
            if (options.recipients[i].address.length === 40) {
                recipientScript = util.miningKeyToScript(options.recipients[i].address);
            }
            txb.addOutput(recipientScript, reward * options.recipients[i].percent);
        });

        // Finalize Transaction
        txHex = txb.toHex();
        txHash = txb.getHash().toString('hex');

        // Return Generated Transaction
        return [txHex, txHash]
    }

    // Structure Bitcoin Protocol Transaction
    this.bitcoin = function(rpcData, extraNoncePlaceholder, options) {

        // Establish Transactions Variables [1]
        var txLockTime = 0;
        var txInSequence = 0;
        var txInPrevOutHash = "";
        var txInPrevOutIndex = Math.pow(2, 32) - 1;
        var txOutputBuffers = [];
        var txVersion = options.coin.txMessages === true ? 2 : 1;

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

        // Handle Block Transactions
        for (var i = 0; i < options.recipients.length; i++) {
            var recipientReward = Math.floor(options.recipients[i].percent * reward);
            var recipientScript = util.addressToScript(options.network, options.recipients[i].address);
            if (options.recipients[i].address.length === 40) {
                recipientScript = util.miningKeyToScript(options.recipients[i].address);
            }
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

        // Return Generated Transaction
        return [[p1, p2], null];
    }
};

// Export Transactions
module.exports = Transactions;
