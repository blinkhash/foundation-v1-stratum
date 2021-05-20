/*
 *
 * Transactions (Updated)
 *
 */

const utils = require('./utils.js');

////////////////////////////////////////////////////////////////////////////////

// Main Transactions Function
const Transactions = function() {

  // Structure Bitcoin Protocol Transaction
  this.bitcoin = function(rpcData, extraNoncePlaceholder, options) {

    const txLockTime = 0;
    const txInSequence = 0;
    const txInPrevOutHash = '';
    const txInPrevOutIndex = Math.pow(2, 32) - 1;
    const txOutputBuffers = [];

    let txType = 0;
    let txExtraPayload;
    let txVersion = options.coin.txMessages === true ? 2 : 1;
    const network = !options.settings.testnet ? options.coin.mainnet : options.coin.testnet;

    // Support Coinbase v3 Block Template
    if (rpcData.coinbase_payload && rpcData.coinbase_payload.length > 0) {
      txVersion = 3;
      txType = 5;
      txExtraPayload = Buffer.from(rpcData.coinbase_payload, 'hex');
    }

    // Handle Version w/ CoinbaseTxn
    if (rpcData.coinbasetxn && rpcData.coinbasetxn.data) {
      txVersion = parseInt(utils.reverseHex(rpcData.coinbasetxn.data.slice(0, 8)), 16);
    } else {
      txVersion = txVersion + (txType << 16);
    }

    let reward = rpcData.coinbasevalue;
    let rewardToPool = reward;
    const poolIdentifier = options.identifier || 'https://github.com/blinkhash/blinkhash-server';
    const poolAddressScript = utils.addressToScript(options.address, network);
    const coinbaseAux = rpcData.coinbaseaux.flags ? Buffer.from(rpcData.coinbaseaux.flags, 'hex') : Buffer.from([]);

    // Handle Comments if Necessary
    const txComment = options.coin.txMessages === true ?
      utils.serializeString(poolIdentifier) :
      Buffer.from([]);

    const scriptSigPart1 = Buffer.concat([
      utils.serializeNumber(rpcData.height),
      coinbaseAux,
      utils.serializeNumber(Date.now() / 1000 | 0),
      Buffer.from([extraNoncePlaceholder.length])
    ]);

    const scriptSigPart2 = utils.serializeString(poolIdentifier);

    const p1 = Buffer.concat([
      utils.packUInt32LE(txVersion),
      utils.varIntBuffer(1),
      utils.uint256BufferFromHash(txInPrevOutHash),
      utils.packUInt32LE(txInPrevOutIndex),
      utils.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
      scriptSigPart1
    ]);

    // Handle Masternodes
    if (rpcData.masternode) {
      if (rpcData.masternode.payee) {
        const payeeReward = rpcData.masternode.amount;
        const payeeScript = utils.addressToScript(rpcData.masternode.payee, network);
        reward -= payeeReward;
        rewardToPool -= payeeReward;
        txOutputBuffers.push(Buffer.concat([
          utils.packUInt64LE(payeeReward),
          utils.varIntBuffer(payeeScript.length),
          payeeScript,
        ]));
      } else if (rpcData.masternode.length > 0) {
        rpcData.masternode.forEach(payee => {
          const payeeReward = payee.amount;
          let payeeScript;
          if (payee.script) {
            payeeScript = Buffer.from(payee.script, 'hex');
          } else {
            payeeScript = utils.addressToScript(payee.payee, network);
          }
          reward -= payeeReward;
          rewardToPool -= payeeReward;
          txOutputBuffers.push(Buffer.concat([
            utils.packUInt64LE(payeeReward),
            utils.varIntBuffer(payeeScript.length),
            payeeScript,
          ]));
        });
      }
    }

    // Handle Superblocks
    if (rpcData.superblock && rpcData.superblock.length > 0) {
      rpcData.superblock.forEach(payee => {
        const payeeReward = payee.amount;
        let payeeScript;
        if (payee.script) {
          payeeScript = Buffer.from(payee.script, 'hex');
        } else {
          payeeScript = utils.addressToScript(payee.payee, network);
        }
        reward -= payeeReward;
        rewardToPool -= payeeReward;
        txOutputBuffers.push(Buffer.concat([
          utils.packUInt64LE(payeeReward),
          utils.varIntBuffer(payeeScript.length),
          payeeScript,
        ]));
      });
    }

    // Handle Other Given Payees
    if (rpcData.payee) {
      const payeeReward = rpcData.payee_amount || Math.ceil(reward / 5);
      const payeeScript = utils.addressToScript(rpcData.payee, network);
      reward -= payeeReward;
      rewardToPool -= payeeReward;
      txOutputBuffers.push(Buffer.concat([
        utils.packUInt64LE(payeeReward),
        utils.varIntBuffer(payeeScript.length),
        payeeScript,
      ]));
    }

    // Handle Secondary Transactions
    switch (options.coin.rewards) {
    default:
      break;
    }

    // Handle Recipient Transactions
    options.recipients.forEach(recipient => {
      const recipientReward = Math.floor(recipient.percentage * reward);
      const recipientScript = utils.addressToScript(recipient.address, network);
      reward -= recipientReward;
      rewardToPool -= recipientReward;
      txOutputBuffers.push(Buffer.concat([
        utils.packUInt64LE(recipientReward),
        utils.varIntBuffer(recipientScript.length),
        recipientScript,
      ]));
    });

    // Handle Pool Transaction
    txOutputBuffers.unshift(Buffer.concat([
      utils.packUInt64LE(rewardToPool),
      utils.varIntBuffer(poolAddressScript.length),
      poolAddressScript
    ]));

    // Handle Witness Commitment
    if (rpcData.default_witness_commitment !== undefined) {
      const witness_commitment = Buffer.from(rpcData.default_witness_commitment, 'hex');
      txOutputBuffers.unshift(Buffer.concat([
        utils.packUInt64LE(0),
        utils.varIntBuffer(witness_commitment.length),
        witness_commitment
      ]));
    }

    const outputTransactions = Buffer.concat([
      utils.varIntBuffer(txOutputBuffers.length),
      Buffer.concat(txOutputBuffers)
    ]);

    let p2 = Buffer.concat([
      scriptSigPart2,
      utils.packUInt32LE(txInSequence),
      outputTransactions,
      utils.packUInt32LE(txLockTime),
      txComment
    ]);

    // Check for Extra Transaction Payload
    if (txExtraPayload !== undefined) {
      p2 = Buffer.concat([
        p2,
        utils.varIntBuffer(txExtraPayload.length),
        txExtraPayload
      ]);
    }

    return [p1, p2];
  };
};

module.exports = Transactions;
