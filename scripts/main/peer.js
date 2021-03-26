/*
 *
 * Peer (Updated)
 *
 */

// Import Required Modules
let net = require('net');
let crypto = require('crypto');
const events = require('events');
let util = require('./util.js');

// Generate String Buffer from Parameter Length
function fixedLenStringBuffer(s, len) {
    let buff = Buffer.alloc(len);
    buff.fill(0);
    buff.write(s);
    return buff;
};

// Generate Command String Buffer
function commandStringBuffer(s) {
    return fixedLenStringBuffer(s, 12);
};

/* Reads a set amount of bytes from a flowing stream, argument descriptions:
   - stream to read from, must have data emitter
   - amount of bytes to read
   - preRead argument can be used to set start with an existing data buffer
   - callback returns 1) data buffer and 2) lopped/over-read data */

// Read Bytes Functionality
function readFlowingBytes(stream, amount, preRead, callback) {
    let buff = preRead ? preRead : Buffer.from([]);
    let readData = function (data) {
        buff = Buffer.concat([buff, data]);
        if (buff.length >= amount) {
            let returnData = buff.slice(0, amount);
            let lopped = buff.length > amount ? buff.slice(amount) : null;
            callback(returnData, lopped);
        }
        else
            stream.once('data', readData);
    };
    readData(Buffer.from([]));
};

// Peer Main Function
let Peer = function(options) {

    // Establish Peer Variables
    let _this = this;
    let client;
    let verack = options.verack;
    let validConnectionConfig = options.validConnectionConfig;
    let magic = Buffer.from(options.testnet ? options.coin.peerMagicTestnet : options.coin.peerMagic, 'hex');
    let magicInt = magic.readUInt32LE(0);

    // Bitcoin Inventory Codes
    let invCodes = {
        error: 0,
        tx: 1,
        block: 2
    };

    // Establish Network Variables
    let networkServices = Buffer.from('0100000000000000', 'hex'); // NODE_NETWORK services (value 1 packed as uint64)
    let emptyNetAddress = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
    let userAgent = util.varStringBuffer('/node-stratum/');
    let blockStartHeight = Buffer.from('00000000', 'hex'); // block start_height, can be empty
    let relayTransactions = options.p2p.disableTransactions === true ? Buffer.from([false]) : Buffer.from([]);

    // Establish Peer Commands
    let commands = {
        version: commandStringBuffer('version'),
        inv: commandStringBuffer('inv'),
        verack: commandStringBuffer('verack'),
        addr: commandStringBuffer('addr'),
        getblocks: commandStringBuffer('getblocks')
    };

    // Initialize Peer Connection
    this.initializePeer = function() {
        const client = _this.connectPeer();
        return client;
    }

    // Establish Peer Connection
    this.connectPeer = function() {
        client = net.connect({
            host: options.p2p.host,
            port: options.p2p.port
        }, function () {
            _this.sendVersion();
        });

        // Manage Peer Close Functionality
        client.on('close', function () {
            if (verack) {
                _this.emit('disconnected');
                verack = false;
                _this.connectPeer();
            }
            else if (validConnectionConfig) {
                _this.emit('connectionRejected');
            }
        });

        // Manage Peer Error Functionality
        client.on('error', function (e) {
            if (e.code === 'ECONNREFUSED') {
                validConnectionConfig = false;
                _this.emit('connectionFailed');
            }
            else {
                _this.emit('socketError', e);
            }
        });

        // Allow Peer to Receive/Send Messages
        _this.setupMessageParser(client);
        return client;
    }

    // Establish Peer Message Parser
    this.setupMessageParser = function(client) {
        let beginReadingMessage = function (preRead) {
            readFlowingBytes(client, 24, preRead, function (header, lopped) {
                let msgMagic = header.readUInt32LE(0);
                if (msgMagic !== magicInt) {
                    _this.emit('error', 'bad magic number from peer');
                    while (header.readUInt32LE(0) !== magicInt && header.length >= 4) {
                        header = header.slice(1);
                    }
                    if (header.readUInt32LE(0) === magicInt) {
                        beginReadingMessage(header);
                    }
                    else {
                        beginReadingMessage(Buffer.from([]));
                    }
                    return;
                }
                let msgCommand = header.slice(4, 16).toString();
                let msgLength = header.readUInt32LE(16);
                let msgChecksum = header.readUInt32LE(20);
                readFlowingBytes(client, msgLength, lopped, function (payload, lopped) {
                    if (util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
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
    }

    // Handle Peer Inventory
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
                    let tx = payload.slice(4, 36).toString('hex');
                    break;
                case invCodes.block:
                    let block = payload.slice(4, 36).toString('hex');
                    _this.emit('blockFound', block);
                    break;
            }
            payload = payload.slice(36);
        }
    }

    // Handle Peer Messages
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

    }

    // Broadcast/Send Peer Messages
    this.sendMessage = function(command, payload) {
        let message = Buffer.concat([
            magic,
            command,
            util.packUInt32LE(payload.length),
            util.sha256d(payload).slice(0, 4),
            payload
        ]);
        client.write(message);
        _this.emit('sentMessage', message);
    }

    // Broadcast/Send Peer Version
    this.sendVersion = function() {
        let payload = Buffer.concat([
            util.packUInt32LE(options.protocolVersion),
            networkServices,
            util.packUInt64LE(Date.now() / 1000 | 0),
            emptyNetAddress,
            emptyNetAddress,
            crypto.pseudoRandomBytes(8),
            userAgent,
            blockStartHeight,
            relayTransactions
        ]);
        _this.sendMessage(commands.version, payload);
    }

    // Initialize Peer Connection
    let connection = _this.initializePeer();
};

// Export Peer
module.exports = Peer;
Peer.prototype.__proto__ = events.EventEmitter.prototype;
