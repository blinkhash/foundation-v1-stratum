/*
 *
 * Peer (Updated)
 *
 */

// Import Required Modules
var net = require('net');
var crypto = require('crypto');
var events = require('events');
var util = require('./util.js');

// Generate String Buffer from Parameter Length
var fixedLenStringBuffer = function(s, len) {
    var buff = Buffer.alloc(len);
    buff.fill(0);
    buff.write(s);
    return buff;
};

// Generate Command String Buffer
var commandStringBuffer = function (s) {
    return fixedLenStringBuffer(s, 12);
};

/* Reads a set amount of bytes from a flowing stream, argument descriptions:
   - stream to read from, must have data emitter
   - amount of bytes to read
   - preRead argument can be used to set start with an existing data buffer
   - callback returns 1) data buffer and 2) lopped/over-read data */

// Read Bytes Functionality
var readFlowingBytes = function (stream, amount, preRead, callback) {
    var buff = preRead ? preRead : Buffer.from([]);
    var readData = function (data) {
        buff = Buffer.concat([buff, data]);
        if (buff.length >= amount) {
            var returnData = buff.slice(0, amount);
            var lopped = buff.length > amount ? buff.slice(amount) : null;
            callback(returnData, lopped);
        }
        else
            stream.once('data', readData);
    };
    readData(Buffer.from([]));
};

// Peer Main Function
var Peer = function(options) {

    // Establish Peer Variables
    var _this = this;
    var client;
    var magic = Buffer.from(options.testnet ? options.coin.peerMagicTestnet : options.coin.peerMagic, 'hex');
    var magicInt = magic.readUInt32LE(0);
    var verack = false;
    var validConnectionConfig = true;

    // Bitcoin Inventory Codes
    var invCodes = {
        error: 0,
        tx: 1,
        block: 2
    };

    // Establish Network Variables
    var networkServices = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
    var emptyNetAddress = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
    var userAgent = util.varStringBuffer('/node-stratum/');
    var blockStartHeight = Buffer.from('00000000', 'hex'); //block start_height, can be empty
    var relayTransactions = options.p2p.disableTransactions === true ? Buffer.from([false]) : Buffer.from([]);

    // Establish Peer Commands
    var commands = {
        version: commandStringBuffer('version'),
        inv: commandStringBuffer('inv'),
        verack: commandStringBuffer('verack'),
        addr: commandStringBuffer('addr'),
        getblocks: commandStringBuffer('getblocks')
    };

    // Initialize Peer Connection
    function initializePeer() {
        connectPeer();
    }

    // Establish Peer Connection
    function connectPeer() {
        client = net.connect({
            host: options.p2p.host,
            port: options.p2p.port
        }, function () {
            sendVersion();
        });

        // Manage Peer Close Functionality
        client.on('close', function () {
            if (verack) {
                _this.emit('disconnected');
                verack = false;
                connectPeer();
            }
            else if (validConnectionConfig)
                _this.emit('connectionRejected');

        });

        // Manage Peer Error Functionality
        client.on('error', function (e) {
            if (e.code === 'ECONNREFUSED') {
                validConnectionConfig = false;
                _this.emit('connectionFailed');
            }
            else
                _this.emit('socketError', e);
        });

        // Allow Peer to Receive/Send Messages
        setupMessageParser(client);
    }

    // Establish Peer Message Parser
    function setupMessageParser(client) {
        var beginReadingMessage = function (preRead) {
            readFlowingBytes(client, 24, preRead, function (header, lopped) {
                var msgMagic = header.readUInt32LE(0);
                if (msgMagic !== magicInt) {
                    _this.emit('error', 'bad magic number from peer');
                    while (header.readUInt32LE(0) !== magicInt && header.length >= 4) {
                        header = header.slice(1);
                    }
                    if (header.readUInt32LE(0) === magicInt) {
                        beginReadingMessage(header);
                    } else {
                        beginReadingMessage(Buffer.from([]));
                    }
                    return;
                }
                var msgCommand = header.slice(4, 16).toString();
                var msgLength = header.readUInt32LE(16);
                var msgChecksum = header.readUInt32LE(20);
                readFlowingBytes(client, msgLength, lopped, function (payload, lopped) {
                    if (util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
                        _this.emit('error', 'bad payload - failed checksum');
                        beginReadingMessage(null);
                        return;
                    }
                    handleMessage(msgCommand, payload);
                    beginReadingMessage(lopped);
                });
            });
        };
        beginReadingMessage(null);
    }

    // Handle Peer Inventory
    function handleInventory(payload) {
        var count = payload.readUInt8(0);
        payload = payload.slice(1);
        if (count >= 0xfd)
        {
            count = payload.readUInt16LE(0);
            payload = payload.slice(2);
        }
        while (count--) {
            switch(payload.readUInt32LE(0)) {
                case invCodes.error:
                    break;
                case invCodes.tx:
                    var tx = payload.slice(4, 36).toString('hex');
                    break;
                case invCodes.block:
                    var block = payload.slice(4, 36).toString('hex');
                    _this.emit('blockFound', block);
                    break;
            }
            payload = payload.slice(36);
        }
    }

    // Handle Peer Messages
    function handleMessage(command, payload) {
        _this.emit('peerMessage', {command: command, payload: payload});
        switch (command) {
            case commands.inv.toString():
                handleInventory(payload);
                break;
            case commands.verack.toString():
                if(!verack) {
                    verack = true;
                    _this.emit('connected');
                }
                break;
            case commands.version.toString():
                sendMessage(commands.verack, Buffer.alloc(0));
                break;
            default:
                break;
        }

    }

    // Broadcast/Send Peer Messages
    function sendMessage(command, payload) {
        var message = Buffer.concat([
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
    function sendVersion() {
        var payload = Buffer.concat([
            util.packUInt32LE(options.protocolVersion),
            networkServices,
            util.packInt64LE(Date.now() / 1000 | 0),
            emptyNetAddress,
            emptyNetAddress,
            crypto.pseudoRandomBytes(8),
            userAgent,
            blockStartHeight,
            relayTransactions
        ]);
        sendMessage(commands.version, payload);
    }

    // Initialize Peer Connection
    var connection = initializePeer();
};

module.exports = Peer;
Peer.prototype.__proto__ = events.EventEmitter.prototype;
