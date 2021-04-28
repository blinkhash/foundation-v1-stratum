/*
 *
 * Stratum (Updated)
 *
 */

const events = require('events');
const Stratum = require('../main/stratum');

const options = {
    "address": "",
    "asicBoost": true,
    "banning": {
        "enabled": true,
        "time": 600,
        "invalidPercent": 50,
        "checkThreshold": 5,
        "purgeInterval": 300
    },
    "coin": {
        "name": "Bitcoin",
        "symbol": "BTC",
        "algorithm": "sha256d",
        "hasGetInfo": false,
        "segwit": true,
        "mainnet": {
            "bech32": "bc",
            "bip32": {
                "public": 0x0488b21e,
                "private": 0x0488ade4,
            },
            "peerMagic": "f9beb4d9",
            "pubKeyHash": 0x00,
            "scriptHash": 0x05,
            "wif": 0x80,
            "coin": "btc",
        },
        "testnet": {
            "bech32": "tb",
            "bip32": {
                "public": 0x043587cf,
                "private": 0x04358394,
            },
            "peerMagic": "0b110907",
            "pubKeyHash": 0x6f,
            "scriptHash": 0xc4,
            "wif": 0xef,
            "coin": "btc",
        }
    },
    "connectionTimeout": 600,
    "daemons": [{
        "host": "127.0.0.1",
        "port": 8332,
        "user": "",
        "password": ""
    }],
    "jobRebroadcastTimeout": 60,
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
    "tcpProxyProtocol": false,
};

////////////////////////////////////////////////////////////////////////////////

function mockClient() {
    const socket = new events.EventEmitter();
    socket.remoteAddress = "127.0.0.1",
    socket.destroy = () => {};
    socket.setEncoding = () => {};
    socket.setKeepAlive = () => {};
    socket.write = (data) => { socket.emit("log", data); };
    const client = new events.EventEmitter();
    client.previousDifficulty = 0;
    client.difficulty = 1,
    client.extraNonce1 = 0,
    client.socket = socket;
    client.socket.localPort = 3001;
    client.getLabel = () => { return "client [example]"; };
    client.sendDifficulty = () => {};
    client.sendMiningJob = () => {};
    return client;
}

function mockSocket() {
    const socket = new events.EventEmitter();
    socket.remoteAddress = "127.0.0.1",
    socket.destroy = () => {};
    socket.setEncoding = () => {};
    socket.setKeepAlive = () => {};
    socket.write = (data) => { socket.emit("log", data); };
    return socket;
}

////////////////////////////////////////////////////////////////////////////////

describe('Test stratum functionality', () => {

    test('Test initialization of stratum network', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        expect(typeof stratum).toBe("object");
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum banning capabilities [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const client = mockClient();
        client.on('kickedBannedIP', timeLeft => {
            stratum.on('stopped', () => done());
            expect(timeLeft >= 0).toBeTruthy();
            stratum.stopServer();
        });
        stratum.addBannedIP(client.remoteAddress);
        stratum.checkBan(client);
    });

    test('Test stratum banning capabilities [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.banning = Object.assign({}, options.banning);
        optionsCopy.banning.time = -1;
        const stratum = new Stratum.network(optionsCopy, () => {});
        const client = mockClient();
        client.on('forgaveBannedIP', () => {
            stratum.on('stopped', () => done());
            stratum.stopServer();
        });
        stratum.addBannedIP(client.remoteAddress);
        stratum.checkBan(client);
    });

    test('Test stratum banning capabilities [3]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.banning = Object.assign({}, options.banning);
        optionsCopy.banning.enabled = false;
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        expect(client.considerBan(true)).toBe(false);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum banning capabilities [4]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        expect(client.considerBan(true)).toBe(false);
        expect(client.shares.valid).toBe(1);
        expect(client.shares.invalid).toBe(0);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum banning capabilities [5]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        for (let step = 0; step < 3; step += 1) {
            expect(client.considerBan(true)).toBe(false);
        }
        expect(client.shares.valid).toBe(3);
        expect(client.shares.invalid).toBe(0);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum banning capabilities [6]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        for (let step = 0; step < 5; step += 1) {
            expect(client.considerBan(true)).toBe(false);
        }
        expect(client.shares.valid).toBe(0);
        expect(client.shares.invalid).toBe(0);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum banning capabilities [7]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        for (let step = 0; step < 5; step += 1) {
            expect(client.considerBan(true)).toBe(false);
        }
        expect(client.considerBan(false)).toBe(false);
        expect(client.shares.valid).toBe(0);
        expect(client.shares.invalid).toBe(1);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum banning capabilities [8]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.on('triggerBan', (timeout) => {
            stratum.on('stopped', () => done());
            expect(timeout).toBe("5 out of the last 5 shares were invalid");
            stratum.stopServer();
        });
        for (let step = 0; step < 5; step += 1) {
            if (step === 4) {
                expect(client.considerBan(false)).toBe(true);
            }
            else {
                expect(client.considerBan(false)).toBe(false);
            }
        }
    });

    test('Test stratum handling of new clients [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
        expect(subscriptionId).toBe("deadbeefcafebabe0100000000000000");
        expect(typeof stratum.stratumClients["deadbeefcafebabe0100000000000000"]).toBe("object");
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum handling of new clients [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        stratum.on('client.disconnected', () => {
            stratum.on('stopped', () => done());
            expect(Object.keys(stratum.stratumClients).length).toBe(0);
            stratum.stopServer();
        });
        client.emit('socketDisconnect');
    });

    test('Test stratum handling of new clients [3]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        stratum.on('client.banned', () => {
            stratum.on('stopped', () => done());
            expect(Object.keys(stratum.bannedIPs).length).toBe(1);
            expect(typeof stratum.bannedIPs["127.0.0.1"]).toBe("number");
            stratum.stopServer();
        });
        client.emit('triggerBan');
    });

    test('Test stratum job broadcasting [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        optionsCopy.connectionTimeout = -1;
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.on('socketTimeout', (timeout) => {
            stratum.on('stopped', () => done());
            expect(timeout).toBe("last submitted a share was 0 seconds ago");
            stratum.stopServer();
        });
        stratum.broadcastMiningJobs({});
    });

    test('Test stratum job broadcasting [2]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.pendingDifficulty = 8;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 2) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"method":"mining.set_difficulty","params":[8]}\n');
                expect(response[1]).toBe('{"id":null,"method":"mining.notify","params":{}}\n');
                stratum.stopServer();
            }
        });
        stratum.broadcastMiningJobs({});
    });

    test('Test stratum job broadcasting [3]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"method":"mining.notify","params":{}}\n');
                stratum.stopServer();
            }
        });
        stratum.broadcastMiningJobs({});
    });

    test('Test stratum client labelling', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.workerName = "worker1";
        expect(client.getLabel()).toBe("worker1 [127.0.0.1]");
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum client difficulty queueing', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.enqueueNextDifficulty(8);
        expect(client.pendingDifficulty).toBe(8);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum client difficulty management', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"method":"mining.set_difficulty","params":[8]}\n');
                stratum.stopServer();
            }
        });
        expect(client.sendDifficulty(0)).toBe(false);
        expect(client.sendDifficulty(8)).toBe(true);
    });

    test('Test stratum message handling [1]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.authorized = true;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":[[["mining.set_difficulty","deadbeefcafebabe0100000000000000"],["mining.notify","deadbeefcafebabe0100000000000000"]],"extraNonce1","extraNonce2Size"],"error":null}\n');
                stratum.stopServer();
            }
        });
        client.on('subscription', function(params, resultCallback) {
            resultCallback(null, "extraNonce1", "extraNonce2Size");
        });
        client.handleMessage({ id: null, method: "mining.subscribe" });
    });

    test('Test stratum message handling [2]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.authorized = true;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":null,"error":true}\n');
                stratum.stopServer();
            }
        });
        client.on('subscription', function(params, resultCallback) {
            resultCallback(true, null, null);
        });
        client.handleMessage({ id: null, method: "mining.subscribe" });
    });

    test('Test stratum message handling [3]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, (addr, port, username, password, callback) => {
            callback({ error: null, authorized: true, disconnect: true });
        });
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.authorized = true;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":true,"error":null}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.authorize", params: ["username", "password"] });
    });

    test('Test stratum message handling [4]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        optionsCopy.asicBoost = false;
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":{"version-rolling":false},"error":null}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.configure" });
        expect(client.asicBoost).toBe(false);
        expect(client.versionMask).toBe("00000000");
    });

    test('Test stratum message handling [5]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":{"version-rolling":true,"version-rolling.mask":"1fffe000"},"error":null}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.configure" });
        expect(client.asicBoost).toBe(true);
        expect(client.versionMask).toBe("1fffe000");
    });

    test('Test stratum message handling [6]', () => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        optionsCopy.asicBoost = false;
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.handleMessage({ id: null, method: "mining.multi_version", params: [1] });
        expect(client.asicBoost).toBe(false);
        expect(client.versionMask).toBe("00000000");
        stratum.stopServer();
    });

    test('Test stratum message handling [7]', () => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.handleMessage({ id: null, method: "mining.multi_version", params: [1] });
        expect(client.asicBoost).toBe(false);
        expect(client.versionMask).toBe("00000000");
        stratum.stopServer();
    });

    test('Test stratum message handling [8]', () => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.handleMessage({ id: null, method: "mining.multi_version", params: [4] });
        expect(client.asicBoost).toBe(true);
        expect(client.versionMask).toBe("1fffe000");
        stratum.stopServer();
    });

    test('Test stratum message handling [9]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":null,"error":[24,"unauthorized worker",null]}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.submit" });
        expect(client.shares.invalid).toBe(1);
    });

    test('Test stratum message handling [10]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.authorized = true;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":null,"error":[25,"not subscribed",null]}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.submit" });
        expect(client.shares.invalid).toBe(1);
    });

    test('Test stratum message handling [11]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.authorized = true;
        client.extraNonce1 = true;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":true,"error":null}\n');
                stratum.stopServer();
            }
        });
        client.on('submit', function(params, resultCallback) {
            resultCallback(null, true);
        });
        client.handleMessage({ id: null, method: "mining.submit" });
        expect(client.shares.valid).toBe(1);
    });

    test('Test stratum message handling [12]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":[],"error":[20,"Not supported.",null]}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.get_transactions" });
    });

    test('Test stratum message handling [13]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
                stratum.on('stopped', () => done());
                expect(response[0]).toBe('{"id":null,"result":false,"error":[20,"Not supported.",null]}\n');
                stratum.stopServer();
            }
        });
        client.handleMessage({ id: null, method: "mining.extranonce.subscribe" });
    });

    test('Test stratum message handling [14]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.handleMessage({ id: null, method: "mining.unknown" });
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });
});
