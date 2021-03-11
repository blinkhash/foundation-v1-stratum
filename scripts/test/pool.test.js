/*
 *
 * Pool (Updated)
 *
 */

// Import Required Modules
const nock = require('nock');

// Import Required Modules
const Pool = require('../main/pool');

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

nock.disableNetConnect()
nock.enableNetConnect('127.0.0.1')

////////////////////////////////////////////////////////////////////////////////

describe('Test pool functionality', () => {

    test('Test initialization of pool', () => {
        const pool = new Pool(options, null);
        expect(typeof pool).toBe("object");
    });

    test('Test pool with invalid algorithm', () => {
        const optionsData = Object.assign({}, options);
        optionsData.coin = Object.assign({}, options.coin);
        optionsData.coin.algorithm = "invalid";
        expect(() => new Pool(optionsData, null)).toThrow(Error)
    });

    test('Test initialization of port difficulty', () => {
        const pool = new Pool(options, null);
        pool.setupDifficulty();
        expect(typeof pool.difficulty).toBe('object');
        expect(typeof pool.difficulty['3001']).toBe('object');
        expect(typeof pool.difficulty['3001'].manageClient).toBe('function');
        expect(pool.difficulty['3001']._eventsCount).toBe(1);
    });

    test('Test initialization of daemon', () => {
        const pool = new Pool(options, null);
        pool.setupDaemonInterface(() => console.log("Callback"));
        expect(typeof pool.daemon).toBe('object');
        expect(typeof pool.daemon.indexDaemons).toBe('function');
        expect(typeof pool.daemon.isOnline).toBe('function');
        expect(typeof pool.daemon.initDaemons).toBe('function');
        expect(pool.daemon._eventsCount).toBe(2);
    });

    test('Test pool daemon events [1]', (done) => {
        const optionsData = Object.assign({}, options);
        optionsData.daemons = [];
        const pool = new Pool(optionsData, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('No daemons have been configured - pool cannot start');
            done()
        });
        pool.setupDaemonInterface(() => {});
    });

    test('Test pool daemon events [2]', (done) => {
        const pool = new Pool(options, null);
        const scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(401, {});
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Unauthorized RPC access - invalid RPC username or password');
            done()
        });
        pool.setupDaemonInterface(() => {});
        pool.daemon.cmd('getpeerinfo', [], (results) => {});
    });

    test('Test pool daemon events [3]', (done) => {
        const pool = new Pool(options, null);
        const scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                id: "nocktest",
                error: null,
                result: null,
            }));
        pool.setupDaemonInterface(() => done());
    });

    test('Test pool daemon events [4]', (done) => {
        const pool = new Pool(options, null);
        const scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                id: "nocktest",
                error: true,
                result: null,
            }));
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Failed to connect daemon(s): [{"error":true,"response":null,"instance":{"host":"127.0.0.1","port":8332,"user":"","password":"","index":0}}]');
            done()
        });
        pool.setupDaemonInterface(() => {});
    });

    test('Test pool batch data events [1]', (done) => {
        const optionsData = Object.assign({}, options);
        optionsData.coin = Object.assign({}, options.coin);
        optionsData.coin.hasGetInfo = true;
        const pool = new Pool(optionsData, null);
        let scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                id: "nocktest",
                error: null,
                result: null,
            }));
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Could not start pool, error with init batch RPC call');
            done()
        });
        pool.setupDaemonInterface(() => {
            pool.setupPoolData(() => {});
        });
    });

    test('Test pool batch data events [2]', (done) => {
        const pool = new Pool(options, null);
        let scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                id: "nocktest",
                error: null,
                result: null,
            }));
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Could not start pool, error with init batch RPC call');
            done()
        });
        pool.setupDaemonInterface(() => {
            pool.setupPoolData(() => {});
        });
    });

    test('Test pool batch data events [3]', (done) => {
        const pool = new Pool(options, null);
        let scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                id: "nocktest",
                error: null,
                result: null,
            }));
        pool.setupDaemonInterface(() => {
            scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "example" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { code: -1 }},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => done());

        });
    });

});