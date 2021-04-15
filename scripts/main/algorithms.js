/*
 *
 * Algorithms (Updated)
 *
 */

// Import Required Modules
const multiHashing = require('multi-hashing');
const utils = require('./utils.js');

// Algorithms Main Function
const algorithms = {

    // Sha256 Algorithm
    'sha256d': {
        hash: function(){
            return function(){
                return utils.sha256d.apply(this, arguments);
            };
        }
    },

    // Scrypt Algorithm
    'scrypt': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            const nValue = coinConfig.nValue || 1024;
            const rValue = coinConfig.rValue || 1;
            return function(data){
                return multiHashing.scrypt(data,nValue,rValue);
            };
        }
    },

    // C11 Algorithm
    'c11': {
        hash: function(){
            return function(){
                return multiHashing.c11.apply(this, arguments);
            };
        }
    },

    // X11 Algorithm
    'x11': {
        hash: function(){
            return function(){
                return multiHashing.x11.apply(this, arguments);
            };
        }
    },

    // X13 Algorithm
    'x13': {
        hash: function(){
            return function(){
                return multiHashing.x13.apply(this, arguments);
            };
        }
    },

    // X15 Algorithm
    'x15': {
        hash: function(){
            return function(){
                return multiHashing.x15.apply(this, arguments);
            };
        }
    },

    // X16R Algorithm
    'x16r': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.x16r.apply(this, arguments);
            };
        }
    },

    // X16Rv2 Algorithm
    'x16rv2': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.x16rv2.apply(this, arguments);
            };
        }
    },

    // Nist5 Algorithm
    'nist5': {
        hash: function(){
            return function(){
                return multiHashing.nist5.apply(this, arguments);
            };
        }
    },

    // Quark Algorithm
    'quark': {
        hash: function(){
            return function(){
                return multiHashing.quark.apply(this, arguments);
            };
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
                };
            }
        }
    },

    // Blake Algorithm
    'blake': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.blake.apply(this, arguments);
            };
        }
    },

    // Neoscrypt Algorithm
    'neoscrypt': {
        multiplier: Math.pow(2, 5),
        hash: function(){
            return function(){
                return multiHashing.neoscrypt.apply(this, arguments);
            };
        }
    },

    // Skein Algorithm
    'skein': {
        hash: function(){
            return function(){
                return multiHashing.skein.apply(this, arguments);
            };
        }
    },

    // Groestl Algorithm
    'groestl': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.groestl.apply(this, arguments);
            };
        }
    },

    // Fugue Algorithm
    'fugue': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.fugue.apply(this, arguments);
            };
        }
    },

    // Qubit Algorithm
    'qubit': {
        hash: function(){
            return function(){
                return multiHashing.qubit.apply(this, arguments);
            };
        }
    },
};

// Set Default Multiplier
Object.keys(algorithms).forEach(algo => {
    if (!algorithms[algo].multiplier) {
        algorithms[algo].multiplier = 1;
    }
});

// Export Algorithms
module.exports = algorithms;
