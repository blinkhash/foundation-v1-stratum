/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
let base58 = require('base58-native');
let bchaddr = require('bchaddrjs');
let bignum = require('bignum');
let bitcoin = require('blinkhash-utxo-lib');
let crypto = require('crypto');

// Convert Address to Script
exports.addressToScript = function(addr, network) {
    network = network || {};
    if (network.coin === 'bch' && bchaddr.isCashAddress(addr)) {
        addr = bchaddr.toLegacyAddress(addr)
        return bitcoin.address.toOutputScript(addr, network);
    }
    else if (typeof network.coin !== "undefined") {
        return bitcoin.address.toOutputScript(addr, network);
    }
    else {
        return Buffer.concat([Buffer.from([0x76, 0xa9, 0x14]), bitcoin.address.fromBase58Check(addr).hash, Buffer.from([0x88, 0xac])]);
    }
};

// Convert Bits into Target Bignum
exports.bignumFromBitsBuffer = function(bitsBuff) {
    let numBytes = bitsBuff.readUInt8(0);
    let bigBits = bignum.fromBuffer(bitsBuff.slice(1));
    let target = bigBits.mul(
        bignum(2).pow(
            bignum(8).mul(
                    numBytes - 3
            )
        )
    );
    return target;
};

// Convert Bits into Target Bignum
exports.bignumFromBitsHex = function(bitsString) {
    let bitsBuff = Buffer.from(bitsString, 'hex');
    return exports.bignumFromBitsBuffer(bitsBuff);
};

// Convert Mining Key to Script
exports.miningKeyToScript = function(key) {
    let keyBuffer = Buffer.from(key, 'hex');
    return Buffer.concat([Buffer.from([0x76, 0xa9, 0x14]), keyBuffer, Buffer.from([0x88, 0xac])]);
};

// Alloc/Write UInt16LE
exports.packUInt16LE = function(num) {
    let buff = Buffer.alloc(2);
    buff.writeUInt16LE(num, 0);
    return buff;
};

// Alloc/Write UInt16LE
exports.packUInt16BE = function(num) {
    let buff = Buffer.alloc(2);
    buff.writeUInt16BE(num, 0);
    return buff;
};

// Alloc/Write UInt32LE
exports.packUInt32LE = function(num) {
    let buff = Buffer.alloc(4);
    buff.writeUInt32LE(num, 0);
    return buff;
};

// Alloc/Write UInt32BE
exports.packUInt32BE = function(num) {
    let buff = Buffer.alloc(4);
    buff.writeUInt32BE(num, 0);
    return buff;
};

// Alloc/Write Int64LE
exports.packUInt64LE = function(num) {
    let buff = Buffer.alloc(8);
    buff.writeUInt32LE(num % Math.pow(2, 32), 0);
    buff.writeUInt32LE(Math.floor(num / Math.pow(2, 32)), 4);
    return buff;
};

// Alloc/Write Int64LE
exports.packUInt64BE = function(num) {
    let buff = Buffer.alloc(8);
    buff.writeUInt32BE(Math.floor(num / Math.pow(2, 32)), 0);
    buff.writeUInt32BE(num % Math.pow(2, 32), 4);
    return buff;
};

// Alloc/Write Int32LE
exports.packInt32LE = function(num) {
    let buff = Buffer.alloc(4);
    buff.writeInt32LE(num, 0);
    return buff;
};

// Alloc/Write Int32BE
exports.packInt32BE = function(num) {
    let buff = Buffer.alloc(4);
    buff.writeInt32BE(num, 0);
    return buff;
};

// Range Function
exports.range = function(start, stop, step) {
    if (typeof step === 'undefined') {
        step = 1;
    }
    if (typeof stop === 'undefined') {
        stop = start;
        start = 0;
    }
    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }
    let result = [];
    for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }
    return result;
};

// Reverse Input Buffer
exports.reverseBuffer = function(buff) {
    let reversed = Buffer.alloc(buff.length);
    for (let i = buff.length - 1; i >= 0; i--) {
        reversed[buff.length - i - 1] = buff[i];
    }
    return reversed;
};

// Reverse Byte Order of Input Buffer
exports.reverseByteOrder = function(buff) {
    for (let i = 0; i < 8; i++) {
        buff.writeUInt32LE(buff.readUInt32BE(i * 4), i * 4);
    }
    return exports.reverseBuffer(buff);
};

// Reverse Input Buffer + Hex String
exports.reverseHex = function(hex) {
    return exports.reverseBuffer(Buffer.from(hex, 'hex')).toString('hex');
};

// Serialize Height/Date Input
exports.serializeNumber = function(n) {
    if (n >= 1 && n <= 16) {
        return Buffer.from([0x50 + n]);
    }
    let l = 1;
    let buff = Buffer.alloc(9);
    while (n > 0x7f)
    {
        buff.writeUInt8(n & 0xff, l++);
        n >>= 8;
    }
    buff.writeUInt8(l, 0);
    buff.writeUInt8(n, l++);
    return buff.slice(0, l);
};

// Serialize Strings used for Signature
exports.serializeString = function(s) {
    if (s.length < 253) {
        return Buffer.concat([
            Buffer.from([s.length]),
            Buffer.from(s)
        ]);
    }
    else if (s.length < 0x10000) {
        return Buffer.concat([
            Buffer.from([253]),
            exports.packUInt16LE(s.length),
            Buffer.from(s)
        ]);
    }
    else if (s.length < 0x100000000) {
        return Buffer.concat([
            Buffer.from([254]),
            exports.packUInt32LE(s.length),
            Buffer.from(s)
        ]);
    }
    else {
        return Buffer.concat([
            Buffer.from([255]),
            exports.packUInt16LE(s.length),
            Buffer.from(s)
        ]);
    }
};

// Hash Input w/ Sha256
exports.sha256 = function(buffer) {
    let hash1 = crypto.createHash('sha256');
    hash1.update(buffer);
    return hash1.digest();
};

// Hash Input w/ Sha256d
exports.sha256d = function(buffer) {
    return exports.sha256(exports.sha256(buffer));
};

// Generate Reverse Buffer from Input Hash
exports.uint256BufferFromHash = function(hex) {
    let fromHex = Buffer.from(hex, 'hex');
    if (fromHex.length != 32) {
        let empty = Buffer.alloc(32);
        empty.fill(0);
        fromHex.copy(empty);
        fromHex = empty;
    }
    return exports.reverseBuffer(fromHex);
};

// Generate VarInt Buffer
exports.varIntBuffer = function(n) {
    if (n < 0xfd)
        return Buffer.from([n]);
    else if (n <= 0xffff) {
        let buff = Buffer.alloc(3);
        buff[0] = 0xfd;
        exports.packUInt16LE(n).copy(buff, 1);
        return buff;
    }
    else if (n <= 0xffffffff) {
        let buff = Buffer.alloc(5);
        buff[0] = 0xfe;
        exports.packUInt32LE(n).copy(buff, 1);
        return buff;
    }
    else {
        let buff = Buffer.alloc(9);
        buff[0] = 0xff;
        exports.packUInt64LE(n).copy(buff, 1);
        return buff;
    }
};

// Generate VarString Buffer
exports.varStringBuffer = function(string) {
    let strBuff = Buffer.from(string);
    return Buffer.concat([exports.varIntBuffer(strBuff.length), strBuff]);
};
