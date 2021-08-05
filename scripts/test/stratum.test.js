/*
 *
 * Stratum (Updated)
 *
 */

const events = require('events');
const Client = require('../main/client');
const Network = require('../main/network');

const options = {
  'banning': {
    'time': 600,
    'invalidPercent': 0.5,
    'checkThreshold': 5,
    'purgeInterval': 300
  },
  'ports': [{
    'port': 3001,
    'enabled': true,
    'difficulty': {
      'initial': 32,
      'minimum': 8,
      'maximum': 512,
      'targetTime': 15,
      'retargetTime': 90,
      'variance': 0.3
    }
  }],
  'p2p': {
    'enabled': true,
    'host': '127.0.0.1',
    'port': 8333,
  },
  'settings': {
    'connectionTimeout': 600,
    'jobRebroadcastTimeout': 60,
    'tcpProxyProtocol': false,
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'name': 'Bitcoin',
      'symbol': 'BTC',
      'asicboost': true,
      'getinfo': false,
      'segwit': true,
      'rewards': '',
      'algorithms': {
        'mining': 'sha256d',
        'block': 'sha256d',
        'coinbase': 'sha256d',
      },
      'mainnet': {
        'bech32': 'bc',
        'bip32': {
          'public': 0x0488b21e,
          'private': 0x0488ade4,
        },
        'peerMagic': 'f9beb4d9',
        'pubKeyHash': 0x00,
        'scriptHash': 0x05,
        'wif': 0x80,
        'coin': 'btc',
      },
      'testnet': {
        'bech32': 'tb',
        'bip32': {
          'public': 0x043587cf,
          'private': 0x04358394,
        },
        'peerMagic': '0b110907',
        'pubKeyHash': 0x6f,
        'scriptHash': 0xc4,
        'wif': 0xef,
        'coin': 'btc',
      }
    },
    'daemons': [{
      'host': '127.0.0.1',
      'port': 8332,
      'user': '',
      'password': ''
    }],
    'recipients': [{
      'address': '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      'percentage': 0.05,
    }],
  },
};

////////////////////////////////////////////////////////////////////////////////

function mockSocket() {
  const socket = new events.EventEmitter();
  socket.remoteAddress = '127.0.0.1',
  socket.destroy = () => {};
  socket.setEncoding = () => {};
  socket.setKeepAlive = () => {};
  socket.write = (data) => {
    socket.emit('log', data);
  };
  return socket;
}

function mockClient() {
  const socket = mockSocket();
  const client = new events.EventEmitter();
  client.previousDifficulty = 0;
  client.difficulty = 1,
  client.extraNonce1 = 0,
  client.socket = socket;
  client.socket.localPort = 3001;
  client.getLabel = () => {
    return 'client [example]';
  };
  client.sendDifficulty = () => {};
  client.sendMiningJob = () => {};
  return client;
}

////////////////////////////////////////////////////////////////////////////////

describe('Test stratum functionality', () => {

  let optionsCopy;
  beforeEach(() => {
    optionsCopy = JSON.parse(JSON.stringify(options));
  });

  test('Test initialization of stratum network', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    expect(typeof stratum).toBe('object');
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Text validation of worker name [1]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('test')).toStrictEqual(['test', null]);
  });

  test('Text validation of worker name [2]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('')).toStrictEqual(['', null]);
  });

  test('Text validation of worker name [3]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('example!@#$%^&')).toStrictEqual(['example', null]);
  });

  test('Text validation of worker password', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validatePassword('test')).toBe('test');
  });

  test('Test stratum banning capabilities [1]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
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
    optionsCopy.banning.time = -1;
    const stratum = new Network(optionsCopy, () => {});
    const client = mockClient();
    client.on('forgaveBannedIP', () => {
      stratum.on('stopped', () => done());
      stratum.stopServer();
    });
    stratum.addBannedIP(client.remoteAddress);
    stratum.checkBan(client);
  });

  test('Test stratum banning capabilities [3]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    expect(client.considerBan(true)).toBe(false);
    expect(client.shares.valid).toBe(1);
    expect(client.shares.invalid).toBe(0);
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum banning capabilities [4]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    for (let step = 0; step < 3; step += 1) {
      expect(client.considerBan(true)).toBe(false);
    }
    expect(client.shares.valid).toBe(3);
    expect(client.shares.invalid).toBe(0);
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum banning capabilities [5]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    for (let step = 0; step < 5; step += 1) {
      expect(client.considerBan(true)).toBe(false);
    }
    expect(client.shares.valid).toBe(0);
    expect(client.shares.invalid).toBe(0);
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum banning capabilities [6]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    for (let step = 0; step < 5; step += 1) {
      expect(client.considerBan(true)).toBe(false);
    }
    expect(client.considerBan(false)).toBe(false);
    expect(client.shares.valid).toBe(0);
    expect(client.shares.invalid).toBe(1);
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum banning capabilities [7]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.on('triggerBan', (timeout) => {
      stratum.on('stopped', () => done());
      expect(timeout).toBe('5 out of the last 5 shares were invalid');
      stratum.stopServer();
    });
    for (let step = 0; step < 5; step += 1) {
      if (step === 4) {
        expect(client.considerBan(false)).toBe(true);
      } else {
        expect(client.considerBan(false)).toBe(false);
      }
    }
  });

  test('Test stratum handling of new clients [1]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    const subscriptionId = stratum.handleNewClient(socket);
    expect(subscriptionId).toBe('deadbeefcafebabe0100000000000000');
    expect(typeof stratum.stratumClients['deadbeefcafebabe0100000000000000']).toBe('object');
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum handling of new clients [2]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    stratum.on('client.disconnected', () => {
      stratum.on('stopped', () => done());
      expect(Object.keys(stratum.stratumClients).length).toBe(0);
      stratum.stopServer();
    });
    client.emit('socketDisconnect');
  });

  test('Test stratum handling of new clients [3]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    stratum.on('client.banned', () => {
      stratum.on('stopped', () => done());
      expect(Object.keys(stratum.bannedIPs).length).toBe(1);
      expect(typeof stratum.bannedIPs['127.0.0.1']).toBe('number');
      stratum.stopServer();
    });
    client.emit('triggerBan');
  });

  test('Test stratum job broadcasting [1]', (done) => {
    optionsCopy.settings.connectionTimeout = -1;
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.on('socketTimeout', (timeout) => {
      stratum.on('stopped', () => done());
      expect(timeout).toBe('last submitted a share was 0 seconds ago');
      stratum.stopServer();
    });
    stratum.broadcastMiningJobs({});
  });

  test('Test stratum job broadcasting [2]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
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
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
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

  test('Test stratum client labelling [1]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.addrPrimary = 'worker1';
    client.addrAuxiliary = null;
    expect(client.getLabel()).toBe('worker1 [127.0.0.1]');
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum client labelling [2]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    expect(client.getLabel()).toBe('(unauthorized) [127.0.0.1]');
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum client difficulty queueing', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.enqueueNextDifficulty(8);
    expect(client.pendingDifficulty).toBe(8);
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });

  test('Test stratum client difficulty management', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
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
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.authorized = true;
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":[[["mining.set_difficulty","deadbeefcafebabe0100000000000000"],["mining.notify","deadbeefcafebabe0100000000000000"]],"extraNonce1","extraNonce2Size"],"error":null}\n');
        stratum.stopServer();
      }
    });
    client.on('subscription', (params, resultCallback) => {
      resultCallback(null, 'extraNonce1', 'extraNonce2Size');
    });
    client.handleMessage({ id: null, method: 'mining.subscribe' });
  });

  test('Test stratum message handling [2]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.authorized = true;
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":null,"error":true}\n');
        stratum.stopServer();
      }
    });
    client.on('subscription', (params, resultCallback) => {
      resultCallback(true, null, null);
    });
    client.handleMessage({ id: null, method: 'mining.subscribe' });
  });

  test('Test stratum message handling [3]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, (addr, port, primary, auxiliary, password, callback) => {
      callback({ error: null, authorized: true, disconnect: true });
    });
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.authorized = true;
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":true,"error":null}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.authorize', params: ['username', 'password'] });
  });

  test('Test stratum message handling [4]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, (addr, port, primary, auxiliary, password, callback) => {
      callback({ error: null, authorized: true, disconnect: false });
    });
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.authorized = true;
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":true,"error":null}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.authorize', params: ['username', 'password'] });
  });

  test('Test stratum message handling [5]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, (addr, port, primary, auxiliary, password, callback) => {
      callback({ error: null, authorized: true, disconnect: true });
    });
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.authorized = true;
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":true,"error":null}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.authorize', params: ['primary,auxiliary', 'password'] });
  });

  test('Test stratum message handling [6]', (done) => {
    const response = [];
    optionsCopy.primary.coin.asicboost = false;
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":{"version-rolling":false},"error":null}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.configure' });
    expect(client.asicboost).toBe(false);
    expect(client.versionMask).toBe('00000000');
  });

  test('Test stratum message handling [7]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":{"version-rolling":true,"version-rolling.mask":"1fffe000"},"error":null}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.configure' });
    expect(client.asicboost).toBe(true);
    expect(client.versionMask).toBe('1fffe000');
  });

  test('Test stratum message handling [8]', () => {
    optionsCopy.primary.coin.asicboost = false;
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.handleMessage({ id: null, method: 'mining.multi_version', params: [1] });
    expect(client.asicboost).toBe(false);
    expect(client.versionMask).toBe('00000000');
    stratum.stopServer();
  });

  test('Test stratum message handling [9]', () => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.handleMessage({ id: null, method: 'mining.multi_version', params: [1] });
    expect(client.asicboost).toBe(false);
    expect(client.versionMask).toBe('00000000');
    stratum.stopServer();
  });

  test('Test stratum message handling [10]', () => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.handleMessage({ id: null, method: 'mining.multi_version', params: [4] });
    expect(client.asicboost).toBe(true);
    expect(client.versionMask).toBe('1fffe000');
    stratum.stopServer();
  });

  test('Test stratum message handling [11]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":null,"error":[24,"unauthorized worker",null]}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.invalid).toBe(1);
  });

  test('Test stratum message handling [12]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.authorized = true;
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":null,"error":[25,"not subscribed",null]}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.invalid).toBe(1);
  });

  test('Test stratum message handling [13]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
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
    client.on('submit', (params, resultCallback) => {
      resultCallback(null, true);
    });
    client.handleMessage({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.valid).toBe(1);
  });

  test('Test stratum message handling [14]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":[],"error":[20,"Not supported.",null]}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.get_transactions' });
  });

  test('Test stratum message handling [15]', (done) => {
    const response = [];
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.socket.on('log', text => {
      response.push(text);
      if (response.length === 1) {
        stratum.on('stopped', () => done());
        expect(response[0]).toBe('{"id":null,"result":false,"error":[20,"Not supported.",null]}\n');
        stratum.stopServer();
      }
    });
    client.handleMessage({ id: null, method: 'mining.extranonce.subscribe' });
  });

  test('Test stratum message handling [16]', (done) => {
    const stratum = new Network(optionsCopy, () => {});
    const socket = mockSocket();
    stratum.handleNewClient(socket);
    const client = stratum.stratumClients['deadbeefcafebabe0100000000000000'];
    client.handleMessage({ id: null, method: 'mining.unknown' });
    stratum.on('stopped', () => done());
    stratum.stopServer();
  });
});
