/*
 *
 * Algorithms (Updated)
 *
 */

const hashing = require('foundation-multi-hashing');

////////////////////////////////////////////////////////////////////////////////

// Main Algorithms Function
const Algorithms = {

  // Allium Algorithm
  'allium': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function(){
      return function(){
        return hashing.allium.apply(this, arguments);
      };
    }
  },

  // Blake Algorithm
  'blake': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.blake.apply(this, arguments);
      };
    }
  },

  // C11 Algorithm
  'c11': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.c11.apply(this, arguments);
      };
    }
  },

  // Equihash Algorithm (WIP)
  'equihash': {
    multiplier: 1,
    diff: parseInt('0x0007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    hash: function(options) {
      const parameters = options.parameters || {};
      const N = parameters.N || 200;
      const K = parameters.K || 9;
      const P = parameters.P || 'ZcashPoW';
      return function() {
        return hashing.equihash.apply(this, [arguments[0], arguments[1], P, N, K]);
      };
    }
  },

  // Firopow Algorithm
  'firopow': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    epochLength: 1300,
    hash: function() {
      return function() {
        return hashing.firopow.apply(this, arguments);
      };
    }
  },

  // Fugue Algorithm
  'fugue': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.fugue.apply(this, arguments);
      };
    }
  },

  // Ghostrider Algorithm
  'ghostrider': {
    multiplier: Math.pow(2, 16),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.ghostrider.apply(this, arguments);
      };
    }
  },

  // Groestl Algorithm
  'groestl': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.groestl.apply(this, arguments);
      };
    }
  },

  // Kawpow Algorithm
  'kawpow': {
    multiplier: 1,
    diff: parseInt('0x00000000ff000000000000000000000000000000000000000000000000000000'),
    epochLength: 7500,
    hash: function() {
      return function() {
        return hashing.kawpow.apply(this, arguments);
      };
    }
  },

  // Keccak Algorithm
  'keccak': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function(coinConfig){
      if (coinConfig.normalHashing === true) {
        return function(data, nTimeInt) {
          return hashing.keccak.apply(this, [hashing.keccak(Buffer.concat([data, Buffer.from(nTimeInt.toString(16), 'hex')]))]);
        };
      } else {
        return function() {
          return hashing.keccak.apply(this, arguments);
        };
      }
    }
  },

  // Minotaur Algorithm
  'minotaur': {
    multiplier: Math.pow(2, 12),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.minotaur.apply(this, arguments);
      };
    }
  },

  // MinotaurX Algorithm
  'minotaurx': {
    multiplier: Math.pow(2, 12),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.minotaurx.apply(this, arguments);
      };
    }
  },

  // Nist5 Algorithm
  'nist5': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.nist5.apply(this, arguments);
      };
    }
  },

  // Quark Algorithm
  'quark': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.quark.apply(this, arguments);
      };
    }
  },

  // Qubit Algorithm
  'qubit': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.qubit.apply(this, arguments);
      };
    }
  },

  // Scrypt Algorithm
  'scrypt': {
    multiplier: Math.pow(2, 16),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function(coinConfig){
      const nValue = coinConfig.nValue || 1024;
      const rValue = coinConfig.rValue || 1;
      return function(data){
        return hashing.scrypt.apply(this, [data, nValue, rValue]);
      };
    }
  },

  // Sha256d Algorithm
  'sha256d': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.sha256d.apply(this, arguments);
      };
    }
  },

  // Skein Algorithm
  'skein': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.skein.apply(this, arguments);
      };
    }
  },

  // Verthash Algorithm
  'verthash': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ff000000000000000000000000000000000000000000000000000000'),
    hash: /* istanbul ignore next */ function() {
      // Can't test due to "verthash.dat" file
      return function() {
        return hashing.verthash.apply(this, arguments);
      };
    }
  },

  // X11 Algorithm
  'x11': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.x11.apply(this, arguments);
      };
    }
  },

  // X13 Algorithm
  'x13': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.x13.apply(this, arguments);
      };
    }
  },

  // X15 Algorithm
  'x15': {
    multiplier: 1,
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.x15.apply(this, arguments);
      };
    }
  },

  // X16R Algorithm
  'x16r': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.x16r.apply(this, arguments);
      };
    }
  },

  // X16R Algorithm
  'x16rt': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.x16rt.apply(this, arguments);
      };
    }
  },

  // X16Rv2 Algorithm
  'x16rv2': {
    multiplier: Math.pow(2, 8),
    diff: parseInt('0x00000000ffff0000000000000000000000000000000000000000000000000000'),
    hash: function() {
      return function() {
        return hashing.x16rv2.apply(this, arguments);
      };
    }
  },
};

module.exports = Algorithms;
