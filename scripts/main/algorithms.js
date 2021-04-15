/*
 *
 * Algorithms (Updated)
 *
 */

const multiHashing = require('multi-hashing');
const utils = require('./utils.js');

// Main Algorithms Function
const Algorithms = {
    'sha256d': {
        hash: function(){
            return function(){
                return utils.sha256d.apply(this, arguments);
            };
        }
    },
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
    'c11': {
        hash: function(){
            return function(){
                return multiHashing.c11.apply(this, arguments);
            };
        }
    },
    'x11': {
        hash: function(){
            return function(){
                return multiHashing.x11.apply(this, arguments);
            };
        }
    },
    'x13': {
        hash: function(){
            return function(){
                return multiHashing.x13.apply(this, arguments);
            };
        }
    },
    'x15': {
        hash: function(){
            return function(){
                return multiHashing.x15.apply(this, arguments);
            };
        }
    },
    'x16r': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.x16r.apply(this, arguments);
            };
        }
    },
    'x16rv2': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.x16rv2.apply(this, arguments);
            };
        }
    },
    'nist5': {
        hash: function(){
            return function(){
                return multiHashing.nist5.apply(this, arguments);
            };
        }
    },
    'quark': {
        hash: function(){
            return function(){
                return multiHashing.quark.apply(this, arguments);
            };
        }
    },
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
    'blake': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.blake.apply(this, arguments);
            };
        }
    },
    'neoscrypt': {
        multiplier: Math.pow(2, 5),
        hash: function(){
            return function(){
                return multiHashing.neoscrypt.apply(this, arguments);
            };
        }
    },
    'skein': {
        hash: function(){
            return function(){
                return multiHashing.skein.apply(this, arguments);
            };
        }
    },
    'groestl': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.groestl.apply(this, arguments);
            };
        }
    },
    'fugue': {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.fugue.apply(this, arguments);
            };
        }
    },
    'qubit': {
        hash: function(){
            return function(){
                return multiHashing.qubit.apply(this, arguments);
            };
        }
    },
};

Object.keys(Algorithms).forEach(algo => {
    if (!Algorithms[algo].multiplier) {
        Algorithms[algo].multiplier = 1;
    }
});

module.exports = Algorithms;
