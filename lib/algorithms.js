/*
 *
 * Algorithms (Updated)
 *
 */

// Import Required Modules
var multiHashing = require('multi-hashing');
var util = require('./util.js');

// Global Difficulty
var diff1 = global.diff1 = 0x00000000ffff0000000000000000000000000000000000000000000000000000;

// Main Algorithm Functions
var algos = module.exports = global.algos = {

    // Sha256 Algorithm
    'sha256': {
        hash: function(){
            return function(){
                return util.sha256d.apply(this, arguments);
            }
        }
    },

    // Scrypt Algorithm
    'scrypt': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var nValue = coinConfig.nValue || 1024;
            var rValue = coinConfig.rValue || 1;
            return function(data){
                return multiHashing.scrypt(data,nValue,rValue);
            }
        }
    },

    // Scrypt-OG Algorithm
    'scrypt-og': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var nValue = coinConfig.nValue || 64;
            var rValue = coinConfig.rValue || 1;
            return function(data){
                return multiHashing.scrypt(data,nValue,rValue);
            }
        }
    },

    // Scrypt-Jane Algorithm
    'scrypt-jane': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var nTimestamp = coinConfig.chainStartTime || 1367991200;
            var nMin = coinConfig.nMin || 4;
            var nMax = coinConfig.nMax || 30;
            return function(data, nTime){
                return multiHashing.scryptjane(data, nTime, nTimestamp, nMin, nMax);
            }
        }
    },

    // Scrypt-N Algorithm
    'scrypt-n': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var timeTable = coinConfig.timeTable || {
                "2048": 1389306217, "4096": 1456415081, "8192": 1506746729, "16384": 1557078377, "32768": 1657741673,
                "65536": 1859068265, "131072": 2060394857, "262144": 1722307603, "524288": 1769642992
            };
            var nFactor = (function(){
                var n = Object.keys(timeTable).sort().reverse().filter(function(nKey){
                    return Date.now() / 1000 > timeTable[nKey];
                })[0];

                var nInt = parseInt(n);
                return Math.log(nInt) / Math.log(2);
            })();
            return function(data) {
                return multiHashing.scryptn(data, nFactor);
            }
        }
    },

    // Sha-1 Algorithm
    'sha1': {
        hash: function(){
            return function(){
                return multiHashing.sha1.apply(this, arguments);
            }
        }
    },

    // C11 Algorithm
    'c11': {
        hash: function(){
            return function(){
                return multiHashing.c11.apply(this, arguments);
            }
        }
    },

    // X11 Algorithm
    'x11': {
        hash: function(){
            return function(){
                return multiHashing.x11.apply(this, arguments);
            }
        }
    },

    // X13 Algorithm
    'x13': {
        hash: function(){
            return function(){
                return multiHashing.x13.apply(this, arguments);
            }
        }
    },

    // X15 Algorithm
    'x15': {
        hash: function(){
            return function(){
                return multiHashing.x15.apply(this, arguments);
            }
        }
    },

    // X16R Algorithm
    'x16r': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.x16r.apply(this, arguments);
            }
        }
    },

    // X16Rv2 Algorithm
    'x16rv2': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.x16rv2.apply(this, arguments);
            }
        }
    },

    // Nist5 Algorithm
    'nist5': {
        hash: function(){
            return function(){
                return multiHashing.nist5.apply(this, arguments);
            }
        }
    },

    // Quark Algorithm
    'quark': {
        hash: function(){
            return function(){
                return multiHashing.quark.apply(this, arguments);
            }
        }
    },

    // Keccak Algorithm
    'keccak': {
        multiplier: Math.pow(2, 8),
        hash: function(coinConfig){
            if (coinConfig.normalHashing === true) {
                return function(data, nTimeInt) {
                    return multiHashing.keccak(multiHashing.keccak(Buffer.concat([data, Buffer.from(nTimeInt.toString(16), 'hex')])));
                };
            }
            else {
                return function() {
                    return multiHashing.keccak.apply(this, arguments);
                }
            }
        }
    },

    // Blake Algorithm
    'blake': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.blake.apply(this, arguments);
            }
        }
    },

    // Neoscrypt Algorithm
    'neoscrypt': {
        multiplier: Math.pow(2, 5),
        hash: function(){
            return function(){
                return multiHashing.neoscrypt.apply(this, arguments);
            }
        }
    },

    // Skein Algorithm
    'skein': {
        hash: function(){
            return function(){
                return multiHashing.skein.apply(this, arguments);
            }
        }
    },

    // Groestl Algorithm
    'groestl': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.groestl.apply(this, arguments);
            }
        }
    },

    // Fugue Algorithm
    'fugue': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.fugue.apply(this, arguments);
            }
        }
    },

    // Shavite-3 Algorithm
    'shavite3': {
        hash: function(){
            return function(){
                return multiHashing.shavite3.apply(this, arguments);
            }
        }
    },

    // Hefty-1 Algorithm
    'hefty1': {
        hash: function(){
            return function(){
                return multiHashing.hefty1.apply(this, arguments);
            }
        }
    },

    // Qubit Algorithm
    'qubit': {
        hash: function(){
            return function(){
                return multiHashing.qubit.apply(this, arguments);
            }
        }
    }
};

// Set Default Multiplier
for (var algo in algos){
    if (!algos[algo].multiplier) {
        algos[algo].multiplier = 1;
    }
}
