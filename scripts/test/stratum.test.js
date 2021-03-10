/*
 *
 * Stratum (Updated)
 *
 */

// Import Required Modules
const Stratum = require('../main/stratum');

const options = {
    "address": "",
    "coin": {
        "name": "Bitcoin",
        "symbol": "BTC",
        "algorithm": "sha256d",
        "peerMagic": "f9beb4d9",
        "peerMagicTestnet": "0b110907",
        "hasGetInfo": false,
        "segwit": true,
        "mainnet": {
            "network": "btc",
            "bech32": "bc",
            "bip32": {
                "public": "0488B21E"
            },
            "pubKeyHash": "00",
            "scriptHash": "05"
        },
        "testnet": {
            "network": "btc",
            "bech32": "tb",
            "bip32": {
                "public": "043587CF"
            },
            "pubKeyHash": "6F",
            "scriptHash": "C4"
        }
    },
    "daemons": [{
        "host": "127.0.0.1",
        "port": 8332,
        "user": "",
        "password": ""
    }],
    "ports": {
        "3001": {
            "enabled": true,
            "initial": 32,
            "difficulty": {
                "minDiff": 8,
                "maxDiff": 512,
                "targetTime": 15,
                "retargetTime": 90,
                "variancePercent": 30
            }
        }
    },
    "p2p": {
        "enabled": true,
        "host": "127.0.0.1",
        "port": 8333,
        "disableTransactions": true
    },
    "rewardRecipients": {}
}

////////////////////////////////////////////////////////////////////////////////

describe('Test stratum functionality', () => {

    test('Test initialization of stratum clients', () => {

    });

    test('Test initialization of stratum servers', () => {

    });
});
