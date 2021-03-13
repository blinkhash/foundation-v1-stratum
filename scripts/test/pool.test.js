/*
 *
 * Pool (Updated)
 *
 */

// Import Required Modules
const nock = require('nock');

// Import Required Modules
const Pool = require('../main/pool');

const rpcData = {
    "capabilities": [
        "proposal"
    ],
    "version": 536870912,
    "rules": [],
    "vbavailable": {},
    "vbrequired": 0,
    "previousblockhash": "9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2",
    "transactions": [{
        "data": "0100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000",
        "hash": "7c90a5087ac4d5b9361d47655812c89b4ad0dee6ecd5e08814d00ce7385aa317",
        "depends": [],
        "fee": 10000,
        "sigops": 2
    }],
    "coinbaseaux": {
        "flags": ""
    },
    "coinbasevalue": 5000000000,
    "longpollid": "9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e22",
    "target": "00000ffff0000000000000000000000000000000000000000000000000000000",
    "mintime": 1614044921,
    "mutable": [
        "time",
        "transactions",
        "prevblock"
    ],
    "noncerange": "00000000ffffffff",
    "sigoplimit": 20000,
    "sizelimit": 1000000,
    "curtime": 1614201893,
    "bits": "1e0ffff0",
    "height": 1,
    "default_witness_commitment": "6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9"
}

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
            "messagePrefix": "\x18Bitcoin Signed Message:\n",
            "bech32": "bc",
            "bip32": {
                "public": 0x0488b21e,
                "private": 0x0488ade4,
            },
            "pubKeyHash": 0x00,
            "scriptHash": 0x05,
            "wif": 0x80,
            "coin": "btc",
        },
        "testnet": {
            "messagePrefix": "\x18Bitcoin Signed Message:\n",
            "bech32": "tb",
            "bip32": {
                "public": 0x043587cf,
                "private": 0x04358394,
            },
            "pubKeyHash": 0x6f,
            "scriptHash": 0xc4,
            "wif": 0xef,
            "coin": "btc",
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
    "poolAddress": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "p2p": {
        "enabled": true,
        "host": "127.0.0.1",
        "port": 8333,
        "disableTransactions": true
    },
    "recipients": [{
        "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
        "percentage": 0.05,
    }],
    "rewards": "",
}

nock.disableNetConnect()
nock.enableNetConnect('127.0.0.1')

////////////////////////////////////////////////////////////////////////////////

function mockSetupDaemon(pool, callback) {
    let scope = nock('http://127.0.0.1:8332')
        .post('/', body => body.method === "getpeerinfo")
        .reply(200, JSON.stringify({
            id: "nocktest",
            error: null,
            result: null,
        }));
    pool.setupDaemonInterface(() => callback());
}

function mockSetupData(pool, callback) {
    const scope = nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
            { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
            { id: "nocktest", error: null, result: { networkhashps: 0 }},
            { id: "nocktest", error: true, result: { code: -1 }},
            { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
            { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
    pool.setupPoolData(() => callback());
}

////////////////////////////////////////////////////////////////////////////////

describe('Test pool functionality', () => {

    test('Test initialization of pool', () => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        expect(typeof pool).toBe("object");
    });

    test('Test pool with invalid algorithm', () => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.coin = Object.assign({}, options.coin);
        optionsCopy.coin.algorithm = "invalid";
        expect(() => new Pool(optionsCopy, null)).toThrow(Error)
    });

    test('Test initialization of port difficulty', () => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.setupDifficulty();
        expect(typeof pool.difficulty).toBe('object');
        expect(typeof pool.difficulty['3001']).toBe('object');
        expect(typeof pool.difficulty['3001'].manageClient).toBe('function');
        expect(pool.difficulty['3001']._eventsCount).toBe(1);
    });

    test('Test initialization of daemon', () => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.setupDaemonInterface(() => {});
        expect(typeof pool.daemon).toBe('object');
        expect(typeof pool.daemon.indexDaemons).toBe('function');
        expect(typeof pool.daemon.isOnline).toBe('function');
        expect(typeof pool.daemon.initDaemons).toBe('function');
        expect(pool.daemon._eventsCount).toBe(2);
    });

    test('Test pool daemon events [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.daemons = [];
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('No daemons have been configured - pool cannot start');
            done();
        });
        pool.setupDaemonInterface(() => {});
    });

    test('Test pool daemon events [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        const scope = nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(401, {});
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Unauthorized RPC access - invalid RPC username or password');
            done();
        });
        pool.setupDaemonInterface(() => {});
        pool.daemon.cmd('getpeerinfo', [], (results) => {});
    });

    test('Test pool daemon events [3]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
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
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
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
            done();
        });
        pool.setupDaemonInterface(() => {});
    });

    test('Test pool batch data events [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.coin = Object.assign({}, options.coin);
        optionsCopy.coin.hasGetInfo = true;
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Could not start pool, error with init batch RPC call');
            expect(optionsCopy.coin.hasGetInfo).toBe(true);
            done();
        });
        mockSetupDaemon(pool, () => {
            pool.setupPoolData(() => {});
        })
    });

    test('Test pool batch data events [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Could not start pool, error with init batch RPC call');
            done();
        });
        mockSetupDaemon(pool, () => {
            pool.setupPoolData(() => {});
        })
    });

    test('Test pool batch data events [3]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { code: -1 }},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {
                expect(optionsCopy.testnet).toBe(false);
                expect(typeof optionsCopy.network).toBe('object');
                expect(optionsCopy.poolAddress).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
                expect(optionsCopy.protocolVersion).toBe(1);
                expect(typeof optionsCopy.initStats).toBe('object');
                expect(optionsCopy.hasSubmitMethod).toBe(true);
                done();
            });
        })
    });

    test('Test pool batch data events [4]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Could not start pool, error with init RPC call: validateaddress - true');
            done();
        });
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: true, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { code: -1 }},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {});
        });
    });

    test('Test pool batch data events [5]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Daemon reports address is not valid');
            done();
        });
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: false, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { code: -1 }},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {});
        });
    });

    test('Test pool batch data events [6]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.coin.hasGetInfo = true;
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { code: -1 }},
                    { id: "nocktest", error: null, result: { testnet: false, difficulty: { 'proof-of-work': 0 }, protocolversion: 1, connections: 0 }},
                ]));
            pool.setupPoolData(() => {
                expect(optionsCopy.testnet).toBe(false);
                expect(typeof optionsCopy.network).toBe('object');
                expect(optionsCopy.poolAddress).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
                expect(optionsCopy.protocolVersion).toBe(1);
                expect(typeof optionsCopy.initStats).toBe('object');
                expect(optionsCopy.hasSubmitMethod).toBe(true);
                done();
            });
        });
    });

    test('Test pool batch data events [7]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.coin.hasGetInfo = false;
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { code: -1 }},
                    { id: "nocktest", error: null, result: { chain: 'test', difficulty: { 'proof-of-work': 0 }}},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {
                expect(optionsCopy.testnet).toBe(true);
                expect(typeof optionsCopy.network).toBe('object');
                expect(optionsCopy.poolAddress).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
                expect(optionsCopy.protocolVersion).toBe(1);
                expect(typeof optionsCopy.initStats).toBe('object');
                expect(optionsCopy.hasSubmitMethod).toBe(true);
                done();
            });
        });
    });

    test('Test pool batch data events [8]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { message: 'Method not found' }},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {
                expect(optionsCopy.testnet).toBe(false);
                expect(typeof optionsCopy.network).toBe('object');
                expect(optionsCopy.poolAddress).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
                expect(optionsCopy.protocolVersion).toBe(1);
                expect(typeof optionsCopy.initStats).toBe('object');
                expect(optionsCopy.hasSubmitMethod).toBe(false);
                done();
            });
        });
    });

    test('Test pool batch data events [9]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Could not detect block submission RPC method');
            done();
        });
        mockSetupDaemon(pool, () => {
            const scope = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: {}},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {});
        });
    });

    test('Test pool recipient setup [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                pool.setupRecipients();
                expect(optionsCopy.feePercentage).toBe(0.05);
                done();
            });
        });
    });

    test('Test pool recipient setup [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.recipients = [];
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('No rewardRecipients have been setup which means no fees will be taken');
            done();
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                pool.setupRecipients();
            });
        });
    });

    test('Test initialization of manager', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                pool.setupJobManager();
                expect(typeof pool.manager).toBe('object');
                expect(typeof pool.manager.blockHasher).toBe('function');
                expect(typeof pool.manager.coinbaseHasher).toBe('function');
                expect(typeof pool.manager.updateCurrentJob).toBe('function');
                expect(pool.manager._eventsCount).toBe(3);
                done();
            });
        });
    });

    test('Test pool manager events [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                pool.setupJobManager();
                pool.manager.emit('newBlock', rpcDataCopy)
                done();
            });
        })
    });

    test('Test pool manager events [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                pool.setupJobManager();
                pool.manager.emit('updatedBlock', rpcDataCopy)
                done();
            });
        })
    });

    test('Test pool manager events [3]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('share', (isValidShare, isValidBlock, shareData) => {
            expect(isValidShare).toBe(true);
            expect(isValidBlock).toBe(false);
            expect(shareData.job).toBe(1);
            expect(shareData.blockHashInvalid).toBe("example blockhash")
            done();
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: null,
                    blockHashInvalid: "example blockhash",
                }
                pool.manager.emit('share', shareData, null);
            });
        })
    });

    test('Test pool manager events [4]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('RPC error with daemon instance 0 when submitting block with submitblock true');
            done();
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                const scope = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "submitblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: true,
                        result: null,
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });

    test('Test pool manager events [5]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            expect(type).toBe("error");
            expect(text).toBe('Daemon instance 0 rejected a supposedly valid block');
            done();
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                const scope = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "submitblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: "rejected",
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });

    test('Test pool manager events [6]', (done) => {
        const response = []
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            response.push([type, text]);
            if (response.length === 3) {
                expect(response[0][0]).toBe("debug");
                expect(response[0][1]).toBe("Submitted Block using submitblock successfully to daemon instance(s)");
                expect(response[1][0]).toBe("error");
                expect(response[1][1]).toBe("Block was rejected by the network");
                expect(response[2][0]).toBe("debug");
                expect(response[2][1]).toBe("Block notification via RPC after block submission");
                done();
            }
        });
        pool.on('share', (isValidShare, isValidBlock, shareData) => {
            const scope1 = nock('http://127.0.0.1:8332')
                .post('/', body => body.method === "getblocktemplate")
                .reply(200, JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: rpcDataCopy,
                }));
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                const scope2 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "submitblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                const scope3 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "getblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });

    test('Test pool manager events [7]', (done) => {
        const response = []
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            response.push([type, text]);
            if (response.length === 3) {
                expect(response[0][0]).toBe("debug");
                expect(response[0][1]).toBe("Submitted Block using getblocktemplate successfully to daemon instance(s)");
                expect(response[1][0]).toBe("error");
                expect(response[1][1]).toBe("Block was rejected by the network");
                expect(response[2][0]).toBe("debug");
                expect(response[2][1]).toBe("Block notification via RPC after block submission");
                done();
            }
        });
        pool.on('share', (isValidShare, isValidBlock, shareData) => {
            const scope1 = nock('http://127.0.0.1:8332')
                .post('/', body => body.method === "getblocktemplate")
                .reply(200, JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: rpcDataCopy,
                }));
        });
        mockSetupDaemon(pool, () => {
            const scope2 = nock('http://127.0.0.1:8332')
                .post('/').reply(200, JSON.stringify([
                    { id: "nocktest", error: null, result: { isvalid: true, address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }},
                    { id: "nocktest", error: null, result: { networkhashps: 0 }},
                    { id: "nocktest", error: true, result: { message: 'Method not found' }},
                    { id: "nocktest", error: null, result: { chain: 'main', difficulty: 0 }},
                    { id: "nocktest", error: null, result: { protocolversion: 1, connections: 1 }},
                ]));
            pool.setupPoolData(() => {
                const scope3 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "getblocktemplate")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                const scope4 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "getblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });

    test('Test pool manager events [8]', (done) => {
        const response = []
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            response.push([type, text]);
            if (response.length === 3) {
                expect(response[0][0]).toBe("debug");
                expect(response[0][1]).toBe("Submitted Block using submitblock successfully to daemon instance(s)");
                expect(response[1][0]).toBe("debug");
                expect(response[1][1]).toBe("Block was accepted by the network with 1 confirmations");
                expect(response[2][0]).toBe("debug");
                expect(response[2][1]).toBe("Block notification via RPC after block submission");
                done();
            }
        });
        pool.on('share', (isValidShare, isValidBlock, shareData) => {
            const scope1 = nock('http://127.0.0.1:8332')
                .post('/', body => body.method === "getblocktemplate")
                .reply(200, JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: rpcDataCopy,
                }));
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                const scope2 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "submitblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                const scope3 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "getblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: {
                            hash: "example blockhash",
                            tx: "example transaction",
                            confirmations: 1,
                        },
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });

    test('Test pool manager events [9]', (done) => {
        const response = []
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            response.push([type, text]);
            if (response.length === 3) {
                expect(response[0][0]).toBe("debug");
                expect(response[0][1]).toBe("Submitted Block using submitblock successfully to daemon instance(s)");
                expect(response[1][0]).toBe("error");
                expect(response[1][1]).toBe("Block was rejected by the network");
                expect(response[2][0]).toBe("debug");
                expect(response[2][1]).toBe("Block notification via RPC after block submission");
                done();
            }
        });
        pool.on('share', (isValidShare, isValidBlock, shareData) => {
            const scope1 = nock('http://127.0.0.1:8332')
                .post('/', body => body.method === "getblocktemplate")
                .reply(200, JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: rpcDataCopy,
                }));
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                const scope2 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "submitblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                const scope3 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "getblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: {
                            hash: "example blockhash",
                            tx: "example transaction",
                            confirmations: -1,
                        },
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });

    test('Test pool manager events [10]', (done) => {
        const response = []
        const optionsCopy = Object.assign({}, options);
        const rpcDataCopy = Object.assign({}, rpcData);
        const pool = new Pool(optionsCopy, null);
        pool.on('log', (type, text) => {
            response.push([type, text]);
            if (response.length === 3) {
                expect(response[0][0]).toBe("debug");
                expect(response[0][1]).toBe("Submitted Block using submitblock successfully to daemon instance(s)");
                expect(response[1][0]).toBe("error");
                expect(response[1][1]).toBe("Block was rejected by the network");
                expect(response[2][0]).toBe("error");
                expect(response[2][1]).toBe("getblocktemplate call failed for daemon instance 0 with error true");
                done();
            }
        });
        pool.on('share', (isValidShare, isValidBlock, shareData) => {
            const scope1 = nock('http://127.0.0.1:8332')
                .post('/', body => body.method === "getblocktemplate")
                .reply(200, JSON.stringify({
                    id: "nocktest",
                    error: true,
                    result: null,
                }));
        });
        mockSetupDaemon(pool, () => {
            mockSetupData(pool, () => {
                const scope2 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "submitblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: null,
                    }));
                const scope3 = nock('http://127.0.0.1:8332')
                    .post('/', body => body.method === "getblock")
                    .reply(200, JSON.stringify({
                        id: "nocktest",
                        error: null,
                        result: {
                            hash: "example blockhash",
                            tx: "example transaction",
                            confirmations: -1,
                        },
                    }));
                pool.setupJobManager();
                const shareData = {
                    job: 1,
                    ip: "ip_addr",
                    port: "port",
                    worker: "worker",
                    height: 1,
                    blockReward: 5000000000,
                    difficulty: 1,
                    shareDiff: 1,
                    blockDiff : 1,
                    blockDiffActual: 1,
                    blockHash: "example blockhash",
                    blockHashInvalid: null,
                }
                const blockHex = Buffer.from("000011110000111100001111", "hex");
                pool.manager.emit('share', shareData, blockHex);
            });
        })
    });
});
