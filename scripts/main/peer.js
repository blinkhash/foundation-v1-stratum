/*
 *
 * Peer (Updated)
 *
 */

const net = require('net');
const crypto = require('crypto');
const events = require('events');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

/**
 * Reads a set amount of bytes from a flowing stream, argument descriptions:
 * - stream to read from, must have data emitter
 * - amount of bytes to read
 * - preRead argument can be used to set start with an existing data buffer
 * - callback returns 1) data buffer and 2) lopped/over-read data
**/

// Main Peer Function
const Peer = function(options) {

  const _this = this;
  this.networkServices = Buffer.from('0100000000000000', 'hex');
  this.emptyNetAddress = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
  this.userAgent = utils.varStringBuffer('/node-stratum/');
  this.blockStartHeight = Buffer.from('00000000', 'hex');
  this.relayTransactions = Buffer.from([false]);
  this.magic = Buffer.from(options.settings.testnet ? (
    options.primary.coin.testnet.peerMagic) : (
    options.primary.coin.mainnet.peerMagic), 'hex');
  this.magicInt = _this.magic.readUInt32LE(0);

  let client;
  let verack = options.settings.verack;
  let validConnectionConfig = options.settings.validConnectionConfig;

  const invCodes = {
    error: 0,
    tx: 1,
    block: 2
  };

  const commands = {
    version: utils.commandStringBuffer('version'),
    inv: utils.commandStringBuffer('inv'),
    verack: utils.commandStringBuffer('verack'),
    addr: utils.commandStringBuffer('addr'),
    getblocks: utils.commandStringBuffer('getblocks')
  };

  // Establish Peer Connection
  /* istanbul ignore next */
  this.setupPeer = function() {
    client = net.connect({
      host: options.p2p.host,
      port: options.p2p.port
    }, () => {
      _this.sendVersion();
    });
    client = _this.handleEvents(client);
    _this.setupMessageParser(client);
    return client;
  };

  // Handle Peer Events
  /* istanbul ignore next */
  this.handleEvents = function(client) {
    client.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        validConnectionConfig = false;
        _this.emit('connectionFailed');
      } else {
        _this.emit('socketError', e);
      }
    });
    client.on('close', () => {
      if (verack) {
        verack = false;
        _this.emit('disconnected');
        _this.setupPeer();
      } else if (validConnectionConfig) {
        _this.emit('connectionRejected');
      }
    });
    return client;
  };

  // Read Bytes Functionality
  /* istanbul ignore next */
  this.readFlowingBytes = function(stream, amount, preRead, callback) {
    let buff = preRead ? preRead : Buffer.from([]);
    const readData = function (data) {
      buff = Buffer.concat([buff, data]);
      if (buff.length >= amount) {
        const returnData = buff.slice(0, amount);
        const lopped = buff.length > amount ? buff.slice(amount) : null;
        callback(returnData, lopped);
      } else {
        stream.once('data', readData);
      }
    };
    readData(Buffer.from([]));
  };

  // Establish Peer Message Parser
  /* istanbul ignore next */
  this.setupMessageParser = function(client) {
    const beginReadingMessage = function (preRead) {
      _this.readFlowingBytes(client, 24, preRead, (header, lopped) => {
        const msgMagic = header.readUInt32LE(0);
        if (msgMagic !== _this.magicInt) {
          _this.emit('error', 'bad magic number from peer');
          while (header.readUInt32LE(0) !== _this.magicInt && header.length >= 4) {
            header = header.slice(1);
          }
          if (header.readUInt32LE(0) === _this.magicInt) {
            beginReadingMessage(header);
          } else {
            beginReadingMessage(Buffer.from([]));
          }
          return;
        }
        const msgCommand = header.slice(4, 16).toString();
        const msgLength = header.readUInt32LE(16);
        const msgChecksum = header.readUInt32LE(20);
        _this.readFlowingBytes(client, msgLength, lopped, (payload, lopped) => {
          if (utils.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
            _this.emit('error', 'bad payload - failed checksum');
            beginReadingMessage(null);
            return;
          }
          _this.handleMessage(msgCommand, payload);
          beginReadingMessage(lopped);
        });
      });
    };
    beginReadingMessage(null);
  };

  // Handle Peer Inventory
  /* istanbul ignore next */
  this.handleInventory = function(payload) {
    let count = payload.readUInt8(0);
    payload = payload.slice(1);
    if (count >= 0xfd) {
      count = payload.readUInt16LE(0);
      payload = payload.slice(2);
    }
    while (count--) {
      switch (payload.readUInt32LE(0)) {
      case invCodes.error:
        break;
      case invCodes.tx:
        break;
      case invCodes.block:
        _this.emit('blockFound', payload.slice(4, 36).toString('hex'));
        break;
      }
      payload = payload.slice(36);
    }
  };

  // Handle Peer Messages
  /* istanbul ignore next */
  this.handleMessage = function(command, payload) {
    _this.emit('peerMessage', {command: command, payload: payload});
    switch (command) {
    case commands.inv.toString():
      _this.handleInventory(payload);
      break;
    case commands.verack.toString():
      if(!verack) {
        verack = true;
        _this.emit('connected');
      }
      break;
    case commands.version.toString():
      _this.sendMessage(commands.verack, Buffer.alloc(0));
      break;
    default:
      break;
    }
  };

  // Broadcast/Send Peer Messages
  this.sendMessage = function(command, payload) {
    const message = Buffer.concat([
      _this.magic,
      command,
      utils.packUInt32LE(payload.length),
      utils.sha256d(payload).slice(0, 4),
      payload
    ]);
    client.write(message);
    _this.emit('sentMessage', message);
  };

  // Broadcast/Send Peer Version
  this.sendVersion = function() {
    const payload = Buffer.concat([
      utils.packUInt32LE(options.settings.protocolVersion),
      _this.networkServices,
      utils.packUInt64LE(Date.now() / 1000 | 0),
      _this.emptyNetAddress,
      _this.emptyNetAddress,
      crypto.pseudoRandomBytes(8),
      _this.userAgent,
      _this.blockStartHeight,
      _this.relayTransactions
    ]);
    _this.sendMessage(commands.version, payload);
  };

  // Setup Peer on Initialization
  _this.setupPeer();
};

module.exports = Peer;
Peer.prototype.__proto__ = events.EventEmitter.prototype;
