/*
 *
 * Stratum (Updated)
 *
 */

// Import Required Modules
const events = require('events');
const nock = require('nock');

// Import Required Modules
const Stratum = require('../main/stratum');

const options = {
    "address": "",
    "banning": {
        "enabled": true,
        "time": 600,
        "invalidPercent": 50,
        "checkThreshold": 500,
        "purgeInterval": 300
    },
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
    "connectionTimeout": 600,
    "daemons": [{
        "host": "127.0.0.1",
        "port": 8332,
        "user": "",
        "password": ""
    }],
    "debug": true,
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

nock.disableNetConnect()
nock.enableNetConnect('127.0.0.1')

////////////////////////////////////////////////////////////////////////////////

function mockClient() {
    const socket = new events.EventEmitter();
    socket.remoteAddress = "127.0.0.1",
    socket.destroy = () => {};
    socket.setEncoding = () => {};
    socket.setKeepAlive = (status) => {};
    socket.write = (data) => { socket.emit("log", data) };
    const client = new events.EventEmitter();
    client.previousDifficulty = 0;
    client.difficulty = 1,
    client.extraNonce1 = 0,
    client.socket = socket;
    client.socket.localPort = 3001;
    client.getLabel = () => { return "client [example]" };
    client.sendDifficulty = (difficulty) => {};
    client.sendMiningJob = (jobParams) => {};
    return client;
}

function mockSocket() {
    const socket = new events.EventEmitter();
    socket.remoteAddress = "127.0.0.1",
    socket.destroy = () => {};
    socket.setEncoding = () => {};
    socket.setKeepAlive = (status) => {};
    socket.write = (data) => { socket.emit("log", data) };
    return socket
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

    test('Test stratum handling of new clients [1]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
        expect(subscriptionId).toBe("deadbeefcafebabe0100000000000000")
        expect(typeof stratum.stratumClients["deadbeefcafebabe0100000000000000"]).toBe("object")
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum handling of new clients [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        stratum.on('client.disconnected', () => {
            stratum.on('stopped', () => done());
            expect(Object.keys(stratum.stratumClients).length).toBe(0);
            stratum.stopServer();
        });
        client.emit('socketDisconnect');
    });

    test('Test stratum handling of new clients [2]', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
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
        const subscriptionId = stratum.handleNewClient(socket);
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
        const subscriptionId = stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.pendingDifficulty = 8;
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 2) {
              stratum.on('stopped', () => done());
              expect(response[0]).toBe('{"id":null,"method":"mining.set_difficulty","params":[8]}\n');
              expect(response[1]).toBe('{"id":null,"method":"mining.notify","params":{}}\n');
              stratum.stopServer();
            };
        })
        stratum.broadcastMiningJobs({});
    });

    test('Test stratum job broadcasting [3]', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
              stratum.on('stopped', () => done());
              expect(response[0]).toBe('{"id":null,"method":"mining.notify","params":{}}\n');
              stratum.stopServer();
            };
        })
        stratum.broadcastMiningJobs({});
    });

    test('Test stratum client labelling', (done) => {
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
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
        const subscriptionId = stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.enqueueNextDifficulty(8)
        expect(client.pendingDifficulty).toBe(8);
        stratum.on('stopped', () => done());
        stratum.stopServer();
    });

    test('Test stratum client difficulty management', (done) => {
        const response = [];
        const optionsCopy = Object.assign({}, options);
        const stratum = new Stratum.network(optionsCopy, () => {});
        const socket = mockSocket();
        const subscriptionId = stratum.handleNewClient(socket);
        const client = stratum.stratumClients["deadbeefcafebabe0100000000000000"];
        client.socket.on('log', text => {
            response.push(text);
            if (response.length === 1) {
              stratum.on('stopped', () => done());
              expect(response[0]).toBe('{"id":null,"method":"mining.set_difficulty","params":[8]}\n');
              stratum.stopServer();
            };
        })
        expect(client.sendDifficulty(0)).toBe(false);
        expect(client.sendDifficulty(8)).toBe(true);
    });
});
