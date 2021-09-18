/*
 *
 * Transactions (Updated)
 *
 */

const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Transactions Function
const Transactions = function() {

  // Structure Bitcoin Protocol Transaction
  this.bitcoin = function(rpcData, extraNoncePlaceholder, auxMerkle, options) {

    const txLockTime = 0;
    const txInSequence = 0;
    const txInPrevOutHash = '';
    const txInPrevOutIndex = Math.pow(2, 32) - 1;
    const txOutputBuffers = [];

    let reward = rpcData.coinbasevalue;
    let rewardToPool = reward;
    const network = !options.settings.testnet ? options.primary.coin.mainnet : options.primary.coin.testnet;
    const coinbaseAux = rpcData.coinbaseaux.flags ? Buffer.from(rpcData.coinbaseaux.flags, 'hex') : Buffer.from([]);

    // Calculate Pool Address
    const poolAddressScript = options.primary.coin.staking ? (
      utils.pubkeyToScript(options.primary.pubkey)) : (
      utils.addressToScript(options.primary.address, network));

    // Handle Timestamp if Necessary
    const txTimestamp = options.primary.coin.staking === true ?
      utils.packUInt32LE(rpcData.curtime) :
      Buffer.from([]);

    // Generate ScriptSig
    let scriptSig = Buffer.concat([
      utils.serializeNumber(rpcData.height),
      coinbaseAux,
      utils.serializeNumber(Date.now() / 1000 | 0),
      Buffer.from([extraNoncePlaceholder.length]),
    ]);

    // Handle Auxiliary Chains (AuxPoW)
    if (auxMerkle && options.auxiliary && options.auxiliary.enabled) {
      scriptSig = Buffer.concat([
        scriptSig,
        Buffer.from(options.auxiliary.coin.header, 'hex'),
        utils.reverseBuffer(auxMerkle.root),
        utils.packUInt32LE(auxMerkle.data.length),
        utils.packUInt32LE(0)
      ]);
    }

    // Build First Part of Transaction
    const p1 = Buffer.concat([
      utils.packUInt32LE(options.primary.coin.version),
      txTimestamp,
      utils.varIntBuffer(1),
      utils.uint256BufferFromHash(txInPrevOutHash),
      utils.packUInt32LE(txInPrevOutIndex),
      utils.varIntBuffer(scriptSig.length + extraNoncePlaceholder.length),
      scriptSig
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
    switch (options.primary.coin.rewards) {
    default:
      break;
    }

    // Handle Recipient Transactions
    options.primary.recipients.forEach(recipient => {
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

    // Combine all Transactions
    const outputTransactions = Buffer.concat([
      utils.varIntBuffer(txOutputBuffers.length),
      Buffer.concat(txOutputBuffers)
    ]);

    // Build Second Part of Transaction
    let p2 = Buffer.concat([
      utils.packUInt32LE(txInSequence),
      outputTransactions,
      utils.packUInt32LE(txLockTime),
    ]);

    return [p1, p2];
  };
};

module.exports = Transactions;
