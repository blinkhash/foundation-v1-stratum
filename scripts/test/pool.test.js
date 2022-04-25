/*
 *
 * Pool (Updated)
 *
 */

const events = require('events');
const nock = require('nock');
const Pool = require('../main/pool');

const rpcData = {
  'capabilities': [
    'proposal'
  ],
  'version': 536870912,
  'rules': [],
  'vbavailable': {},
  'vbrequired': 0,
  'previousblockhash': '9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2',
  'transactions': [{
    'data': '0100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000',
    'hash': '7c90a5087ac4d5b9361d47655812c89b4ad0dee6ecd5e08814d00ce7385aa317',
    'depends': [],
    'fee': 10000,
    'sigops': 2
  }],
  'coinbaseaux': {
    'flags': ''
  },
  'coinbasevalue': 5000000000,
  'longpollid': '9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e22',
  'target': '00000ffff0000000000000000000000000000000000000000000000000000000',
  'mintime': 1614044921,
  'mutable': [
    'time',
    'transactions',
    'prevblock'
  ],
  'noncerange': '00000000ffffffff',
  'sigoplimit': 20000,
  'sizelimit': 1000000,
  'curtime': 1614201893,
  'bits': '1e0ffff0',
  'height': 1,
  'default_witness_commitment': '6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9'
};

const auxData = {
  'chainid': 1,
  'hash': '8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2',
  'target': Buffer.from('1', 'hex'),
};

const blockchainData = {
  'chain': 'main',
  'blocks': 1,
  'headers': 1,
  'bestblockhash': '1d5af7e2ad9aeccb110401761938c07a5895d85711c9c5646661a10407c82769',
  'difficulty': 0.000244140625,
  'mediantime': 1614202191,
  'verificationprogress': 3.580678270509504e-08,
  'initialblockdownload': false,
  'chainwork': '0000000000000000000000000000000000000000000000000000000000200020',
  'size_on_disk': 472,
  'pruned': false,
  'softforks': [
    {
      'id': 'bip34',
      'version': 2,
      'reject': {
        'status': false
      }
    },
    {
      'id': 'bip66',
      'version': 3,
      'reject': {
        'status': false
      }
    },
    {
      'id': 'bip65',
      'version': 4,
      'reject': {
        'status': false
      }
    }
  ],
  'bip9_softforks': {
    'csv': {
      'status': 'defined',
      'startTime': 1485561600,
      'timeout': 1517356801,
      'since': 0
    },
    'segwit': {
      'status': 'defined',
      'startTime': 1485561600,
      'timeout': 1517356801,
      'since': 0
    }
  },
  'warnings': ''
};

const peerData = {
  'id': 20,
  'addr': '18.213.13.51:9333',
  'addrlocal': '173.73.155.96:61108',
  'addrbind': '192.168.1.155:61108',
  'services': '000000000000040d',
  'relaytxes': true,
  'lastsend': 1615676709,
  'lastrecv': 1615676709,
  'bytessent': 1793,
  'bytesrecv': 1782,
  'conntime': 1615674308,
  'timeoffset': 0,
  'pingtime': 0.007751,
  'minping': 0.00522,
  'version': 70015,
  'subver': '/LitecoinCore:0.18.1/',
  'inbound': false,
  'addnode': false,
  'startingheight': 1,
  'banscore': 0,
  'synced_headers': 1,
  'synced_blocks': 1,
  'inflight': [],
  'whitelisted': false,
  'minfeefilter': 0.00001000,
  'bytessent_per_msg': {
    'addr': 55,
    'feefilter': 32,
    'getaddr': 24,
    'getheaders': 93,
    'ping': 672,
    'pong': 672,
    'sendcmpct': 66,
    'sendheaders': 24,
    'verack': 24,
    'version': 131
  },
  'bytesrecv_per_msg': {
    'addr': 55,
    'feefilter': 32,
    'headers': 106,
    'ping': 672,
    'pong': 672,
    'sendcmpct': 66,
    'sendheaders': 24,
    'verack': 24,
    'version': 131
  }
};

const poolConfig = {
  'name': 'Pool1',
  'coins': ['Bitcoin', 'Namecoin'],
  'debug': true,
  'banning': {
    'enabled': true,
    'time': 600,
    'invalidPercent': 0.5,
    'checkThreshold': 500,
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
      'getinfo': false,
      'segwit': true,
      'rewards': {},
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
  'auxiliary': {
    'enabled': false,
    'coin': {
      'name': 'Namecoin',
      'symbol': 'NMC',
      'header': 'fabe6d6d'
    },
    'daemons': [{
      'host': '127.0.0.1',
      'port': 8336,
      'user': '',
      'password': ''
    }],
  }
};

const portalConfig = {
  'identifier': 'master',
  'tls': {
    'rootCA': 'rootCA.crt',
    'serverKey': 'server.key',
    'serverCert': 'server.crt',
  },
};

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');
process.env.forkId = '0';

////////////////////////////////////////////////////////////////////////////////

function mockSetupDaemon(pool, callback) {
  nock('http://127.0.0.1:8332')
    .post('/', body => body.method === 'getpeerinfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: null,
    }));
  nock('http://127.0.0.1:8336')
    .post('/', body => body.method === 'getpeerinfo')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: null,
    }));
  pool.setupDaemonInterface(() => callback());
}

function mockSetupData(pool, callback) {
  nock('http://127.0.0.1:8332')
    .post('/').reply(200, JSON.stringify([
      { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
      { id: 'nocktest', error: null, result: { networkhashps: 0 }},
      { id: 'nocktest', error: true, result: { code: -1 }},
      { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
      { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
    ]));
  pool.setupPoolData(() => callback());
}

function mockSetupTestnetData(pool, callback) {
  nock('http://127.0.0.1:8332')
    .post('/').reply(200, JSON.stringify([
      { id: 'nocktest', error: null, result: { isvalid: true, address: 'tb1qprvwwfr5cey54e4353t9dmker7zd9w4uhvkz5p' }},
      { id: 'nocktest', error: null, result: { networkhashps: 0 }},
      { id: 'nocktest', error: true, result: { code: -1 }},
      { id: 'nocktest', error: null, result: { chain: 'test', difficulty: 0 }},
      { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
    ]));
  pool.setupPoolData(() => callback());
}

function mockSetupBlockchain(pool, callback) {
  const rpcDataCopy = Object.assign({}, rpcData);
  nock('http://127.0.0.1:8332')
    .post('/', body => body.method === 'getblocktemplate')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: rpcDataCopy,
    }));
  pool.setupBlockchain(() => callback());
}

function mockSetupFirstJob(pool, callback) {
  const rpcDataCopy = Object.assign({}, rpcData);
  nock('http://127.0.0.1:8332')
    .post('/', body => body.method === 'getblocktemplate')
    .reply(200, JSON.stringify({
      id: 'nocktest',
      error: null,
      result: rpcDataCopy,
    }));
  pool.setupFirstJob(() => callback());
}

////////////////////////////////////////////////////////////////////////////////

describe('Test pool functionality', () => {

  let poolConfigCopy, configCopy, rpcDataCopy;
  beforeEach(() => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
  });

  test('Test initialization of pool', () => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    expect(typeof pool).toBe('object');
  });

  test('Test initialization of port difficulty', () => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.setupDifficulty();
    expect(typeof pool.difficulty).toBe('object');
    expect(typeof pool.difficulty['3001']).toBe('object');
    expect(typeof pool.difficulty['3001'].manageClient).toBe('function');
    expect(pool.difficulty['3001']._eventsCount).toBe(1);
  });

  test('Test initialization of daemon', () => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.setupDaemonInterface(() => {});
    expect(typeof pool.primary.daemon).toBe('object');
    expect(typeof pool.primary.daemon.indexDaemons).toBe('function');
    expect(typeof pool.primary.daemon.isOnline).toBe('function');
    expect(typeof pool.primary.daemon.initDaemons).toBe('function');
    expect(pool.primary.daemon._eventsCount).toBe(3);
  });

  test('Test pool daemon events [1]', (done) => {
    poolConfigCopy.primary.daemons = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('No primary daemons have been configured - pool cannot start');
      done();
    });
    pool.setupDaemonInterface(() => {});
  });

  test('Test pool daemon events [2]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(401, {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Unauthorized RPC access - invalid RPC username or password');
      done();
    });
    pool.setupDaemonInterface(() => {});
    pool.primary.daemon.cmd('getpeerinfo', [], true, () => {});
  });

  test('Test pool daemon events [3]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        id: 'nocktest',
        error: null,
        result: null,
      }));
    pool.setupDaemonInterface(() => done());
  });

  /* eslint-disable no-useless-escape */
  test('Test pool daemon events [4]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        id: 'nocktest',
        error: true,
        result: null,
      }));
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Failed to connect daemon(s): [{"error":true,"response":null,"instance":{"host":"127.0.0.1","port":8332,"user":"","password":"","index":0},\"data\":\"{\\\"id\\\":\\\"nocktest\\\",\\\"error\\\":true,\\\"result\\\":null}\"}]');
      done();
    });
    pool.setupDaemonInterface(() => {});
  });

  test('Test pool daemon events [5]', (done) => {
    poolConfigCopy.auxiliary.enabled = true;
    poolConfigCopy.auxiliary.daemons = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('No auxiliary daemons have been configured - pool cannot start');
      done();
    });
    pool.setupDaemonInterface(() => {});
  });

  test('Test pool daemon events [6]', (done) => {
    poolConfigCopy.auxiliary.enabled = true;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        id: 'nocktest',
        error: null,
        result: null,
      }));
    nock('http://127.0.0.1:8336')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        id: 'nocktest',
        error: null,
        result: null,
      }));
    pool.setupDaemonInterface(() => done());
  });

  test('Test pool batch data events [1]', (done) => {
    poolConfigCopy.primary.coin.getinfo = true;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Could not start pool, error with init batch RPC call');
      expect(poolConfigCopy.primary.coin.getinfo).toBe(true);
      done();
    });
    mockSetupDaemon(pool, () => {
      pool.setupPoolData(() => {});
    });
  });

  test('Test pool batch data events [2]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Could not start pool, error with init batch RPC call');
      done();
    });
    mockSetupDaemon(pool, () => {
      pool.setupPoolData(() => {});
    });
  });

  test('Test pool batch data events [3]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { code: -1 }},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {
        expect(poolConfigCopy.primary.address).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
        expect(poolConfigCopy.settings.testnet).toBe(false);
        expect(poolConfigCopy.settings.protocolVersion).toBe(1);
        expect(poolConfigCopy.settings.hasSubmitMethod).toBe(true);
        expect(typeof poolConfigCopy.statistics).toBe('object');
        done();
      });
    });
  });

  test('Test pool batch data events [4]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Could not start pool, error with init RPC call: validateaddress - true');
      done();
    });
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: true, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { code: -1 }},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {});
    });
  });

  test('Test pool batch data events [5]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Daemon reports address is not valid');
      done();
    });
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: false, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { code: -1 }},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {});
    });
  });

  test('Test pool batch data events [6]', (done) => {
    poolConfigCopy.primary.coin.getinfo = true;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { code: -1 }},
          { id: 'nocktest', error: null, result: { testnet: false, difficulty: { 'proof-of-work': 0 }, protocolversion: 1, connections: 0 }},
        ]));
      pool.setupPoolData(() => {
        expect(poolConfigCopy.primary.address).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
        expect(poolConfigCopy.settings.testnet).toBe(false);
        expect(poolConfigCopy.settings.protocolVersion).toBe(1);
        expect(poolConfigCopy.settings.hasSubmitMethod).toBe(true);
        expect(typeof poolConfigCopy.statistics).toBe('object');
        done();
      });
    });
  });

  test('Test pool batch data events [7]', (done) => {
    poolConfigCopy.primary.coin.getinfo = false;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { code: -1 }},
          { id: 'nocktest', error: null, result: { chain: 'test', difficulty: { 'proof-of-work': 0 }}},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {
        expect(poolConfigCopy.primary.address).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
        expect(poolConfigCopy.settings.testnet).toBe(true);
        expect(poolConfigCopy.settings.protocolVersion).toBe(1);
        expect(poolConfigCopy.settings.hasSubmitMethod).toBe(true);
        expect(typeof poolConfigCopy.statistics).toBe('object');
        done();
      });
    });
  });

  test('Test pool batch data events [8]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { message: 'Method not found' }},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {
        expect(poolConfigCopy.primary.address).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
        expect(poolConfigCopy.settings.testnet).toBe(false);
        expect(poolConfigCopy.settings.protocolVersion).toBe(1);
        expect(poolConfigCopy.settings.hasSubmitMethod).toBe(false);
        expect(typeof poolConfigCopy.statistics).toBe('object');
        done();
      });
    });
  });

  test('Test pool batch data events [9]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Could not detect block submission RPC method');
      done();
    });
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: {}},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {});
    });
  });

  test('Test pool recipient setup [1]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupRecipients();
        expect(poolConfigCopy.settings.feePercentage).toBe(0.05);
        done();
      });
    });
  });

  test('Test pool recipient setup [2]', (done) => {
    poolConfigCopy.primary.recipients = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('warning');
      expect(text).toBe('No recipients have been added which means that no fees will be taken');
      done();
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupRecipients();
      });
    });
  });

  test('Test initialization of manager', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        expect(typeof pool.manager).toBe('object');
        expect(typeof pool.manager.updateCurrentJob).toBe('function');
        expect(pool.manager._eventsCount).toBe(3);
        done();
      });
    });
  });

  test('Test pool manager events [1]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        pool.manager.emit('newBlock', rpcDataCopy);
        done();
      });
    });
  });

  test('Test pool manager events [2]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        pool.manager.emit('updatedBlock', rpcDataCopy);
        done();
      });
    });
  });

  test('Test pool manager events [3]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('RPC error with primary daemon instance 0 when submitting block with submitblock true');
      done();
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'submitblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: true,
            result: null,
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });
  //
  test('Test pool manager events [4]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      expect(type).toBe('error');
      expect(text).toBe('Primary daemon instance 0 rejected a supposedly valid block');
      done();
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'submitblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: 'rejected',
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool manager events [5]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        expect(response[0][0]).toBe('special');
        expect(response[0][1]).toBe('Submitted primary block successfully to Bitcoin\'s daemon instance(s)');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Block was rejected by the network');
        expect(response[2][0]).toBe('special');
        expect(response[2][1]).toBe('Block notification via RPC after primary block submission');
        done();
      }
    });
    pool.on('share', () => {
      nock('http://127.0.0.1:8332')
        .post('/', body => body.method === 'getblocktemplate')
        .reply(200, JSON.stringify({
          id: 'nocktest',
          error: null,
          result: rpcDataCopy,
        }));
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'submitblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool manager events [6]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        expect(response[0][0]).toBe('special');
        expect(response[0][1]).toBe('Submitted primary block successfully to Bitcoin\'s daemon instance(s)');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Block was rejected by the network');
        expect(response[2][0]).toBe('special');
        expect(response[2][1]).toBe('Block notification via RPC after primary block submission');
        done();
      }
    });
    pool.on('share', () => {
      nock('http://127.0.0.1:8332')
        .post('/', body => body.method === 'getblocktemplate')
        .reply(200, JSON.stringify({
          id: 'nocktest',
          error: null,
          result: rpcDataCopy,
        }));
    });
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { message: 'Method not found' }},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblocktemplate')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool manager events [7]', (done) => {
    const response = [];
    poolConfigCopy.primary.coin.segwit = false;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        expect(response[0][0]).toBe('special');
        expect(response[0][1]).toBe('Submitted primary block successfully to Bitcoin\'s daemon instance(s)');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Block was rejected by the network');
        expect(response[2][0]).toBe('special');
        expect(response[2][1]).toBe('Block notification via RPC after primary block submission');
        done();
      }
    });
    pool.on('share', () => {
      nock('http://127.0.0.1:8332')
        .post('/', body => body.method === 'getblocktemplate')
        .reply(200, JSON.stringify({
          id: 'nocktest',
          error: null,
          result: rpcDataCopy,
        }));
    });
    mockSetupDaemon(pool, () => {
      nock('http://127.0.0.1:8332')
        .post('/').reply(200, JSON.stringify([
          { id: 'nocktest', error: null, result: { isvalid: true, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }},
          { id: 'nocktest', error: null, result: { networkhashps: 0 }},
          { id: 'nocktest', error: true, result: { message: 'Method not found' }},
          { id: 'nocktest', error: null, result: { chain: 'main', difficulty: 0 }},
          { id: 'nocktest', error: null, result: { protocolversion: 1, connections: 1 }},
        ]));
      pool.setupPoolData(() => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblocktemplate')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool manager events [8]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('special');
        expect(response[0][1]).toBe('Submitted primary block successfully to Bitcoin\'s daemon instance(s)');
        expect(response[1][0]).toBe('special');
        expect(response[1][1]).toBe('Block notification via RPC after primary block submission');
        done();
      }
    });
    pool.on('share', () => {
      nock('http://127.0.0.1:8332')
        .post('/', body => body.method === 'getblocktemplate')
        .reply(200, JSON.stringify({
          id: 'nocktest',
          error: null,
          result: rpcDataCopy,
        }));
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'submitblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: {
              hash: 'example blockhash',
              tx: 'example transaction',
              confirmations: 1,
            },
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool manager events [9]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        expect(response[0][0]).toBe('special');
        expect(response[0][1]).toBe('Submitted primary block successfully to Bitcoin\'s daemon instance(s)');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Block was rejected by the network');
        expect(response[2][0]).toBe('special');
        expect(response[2][1]).toBe('Block notification via RPC after primary block submission');
        done();
      }
    });
    pool.on('share', () => {
      nock('http://127.0.0.1:8332')
        .post('/', body => body.method === 'getblocktemplate')
        .reply(200, JSON.stringify({
          id: 'nocktest',
          error: null,
          result: rpcDataCopy,
        }));
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'submitblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: {
              hash: 'example blockhash',
              tx: 'example transaction',
              confirmations: -1,
            },
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };
        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool manager events [10]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        expect(response[0][0]).toBe('special');
        expect(response[0][1]).toBe('Submitted primary block successfully to Bitcoin\'s daemon instance(s)');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Block was rejected by the network');
        expect(response[2][0]).toBe('error');
        expect(response[2][1]).toBe('getblocktemplate call failed for daemon instance 0 with error true');
        done();
      }
    });
    pool.on('share', () => {
      nock('http://127.0.0.1:8332')
        .post('/', body => body.method === 'getblocktemplate')
        .reply(200, JSON.stringify({
          id: 'nocktest',
          error: true,
          result: null,
        }));
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'submitblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblock')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: {
              hash: 'example blockhash',
              tx: 'example transaction',
              confirmations: -1,
            },
          }));
        pool.setupJobManager();
        const shareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'primary',
          coinbase: null,
          difficulty: 1,
          hash: 'example blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          height: 1,
          identifier:'master',
          reward: 5000000000,
          shareDiff: 1,
        };
        const auxShareData = {
          job: 1,
          ip: 'ip_addr',
          port: 'port',
          addrPrimary: 'addr1',
          addrAuxiliary: 'addr2',
          blockDiff : 1,
          blockDiffActual: 1,
          blockType: 'auxiliary',
          coinbase: null,
          difficulty: 1,
          hash: 'example auxiliary blockhash',
          hex: Buffer.from('000011110000111100001111', 'hex'),
          header: null,
          headerDiff: null,
          identifier:'master',
          shareDiff: 1,
        };

        pool.manager.emit('share', shareData, auxShareData, true);
      });
    });
  });

  test('Test pool blockchain events [1]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblocktemplate')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: rpcDataCopy,
          }));
        pool.setupBlockchain(() => done());
      });
    });
  });

  test('Test pool blockchain events [2]', (done) => {
    const response = [];
    const blockchainDataCopy = JSON.parse(JSON.stringify(blockchainData));
    const peerDataCopy = JSON.parse(JSON.stringify(peerData));
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('error');
        expect(response[0][1]).toBe('Daemon is still syncing with the network. The server will be started once synced');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Downloaded 100.00% of blockchain from 1 peers');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblocktemplate')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: { code: -10 },
            result: null,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getblockchaininfo')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: blockchainDataCopy,
          }));
        nock('http://127.0.0.1:8332')
          .post('/', body => body.method === 'getpeerinfo')
          .reply(200, JSON.stringify({
            id: 'nocktest',
            error: null,
            result: [peerDataCopy],
          }));
        pool.setupBlockchain(() => done());
      });
    });
  });

  test('Test pool job events [1]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          nock('http://127.0.0.1:8332')
            .post('/', body => body.method === 'getblocktemplate')
            .reply(200, JSON.stringify({
              id: 'nocktest',
              error: null,
              result: rpcDataCopy,
            }));
          pool.setupFirstJob(() => {
            expect(typeof pool.manager.currentJob).toBe('object');
            expect(pool.manager.currentJob.rpcData.height).toBe(1);
            done();
          });
        });
      });
    });
  });

  test('Test pool job events [2]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('error');
        expect(response[0][1]).toBe('getblocktemplate call failed for daemon instance 0 with error true');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Error with getblocktemplate on creating first job, server cannot start');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          nock('http://127.0.0.1:8332')
            .post('/', body => body.method === 'getblocktemplate')
            .reply(200, JSON.stringify({
              id: 'nocktest',
              error: true,
              result: null,
            }));
          pool.setupFirstJob(() => {});
        });
      });
    });
  });

  test('Test pool job events [3]', (done) => {
    poolConfigCopy.auxiliary.enabled = true;
    rpcDataCopy.auxData = auxData;
    const auxDataCopy = JSON.parse(JSON.stringify(auxData));
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('share', (shareData, shareType, blockValid) => {
      expect(shareData.identifier).toBe('master');
      if (shareData.blockType === 'auxiliary') {
        expect(shareType).toBe('valid');
        expect(blockValid).toBe(false);
        expect(shareData.job).toBe(1);
        expect(shareData.hash).toBe('example auxiliary blockhash');
        expect(shareData.blockType).toBe('auxiliary');
        nock.cleanAll();
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          nock('http://127.0.0.1:8332')
            .post('/', body => body.method === 'getblocktemplate')
            .reply(200, JSON.stringify({
              id: 'nocktest',
              error: null,
              result: rpcDataCopy,
            }));
          nock('http://127.0.0.1:8336')
            .persist()
            .post('/', body => body.method === 'getauxblock')
            .reply(200, JSON.stringify({
              id: 'nocktest',
              error: null,
              result: auxDataCopy,
            }));
          pool.setupFirstJob(() => {
            const shareData = {
              job: 1,
              ip: 'ip_addr',
              port: 'port',
              addrPrimary: 'addr1',
              addrAuxiliary: 'addr2',
              blockDiff : 1,
              blockDiffActual: 1,
              blockType: 'share',
              coinbase: Buffer.from('000011110000111100001111', 'hex'),
              difficulty: 1,
              hash: 'example share',
              hex: Buffer.from('000011110000111100001111', 'hex'),
              header: Buffer.from('000011110000111100001111', 'hex'),
              headerDiff: -1,
              height: 1,
              identifier:'master',
              reward: 5000000000,
              shareDiff: 1,
            };
            const auxShareData = {
              job: 1,
              ip: 'ip_addr',
              port: 'port',
              addrPrimary: 'addr1',
              addrAuxiliary: 'addr2',
              blockDiff : 1,
              blockDiffActual: 1,
              blockType: 'auxiliary',
              coinbase: Buffer.from('000011110000111100001111', 'hex'),
              difficulty: 1,
              hash: 'example auxiliary blockhash',
              hex: Buffer.from('000011110000111100001111', 'hex'),
              header: Buffer.from('000011110000111100001111', 'hex'),
              headerDiff: -1,
              identifier:'master',
              shareDiff: 1,
            };
            pool.manager.emit('share', shareData, auxShareData, false);
            done();
          });
        });
      });
    });
  });

  test('Test pool polling events [1]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Block template polling has been disabled');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupBlockPolling();
          });
        });
      });
    });
  });

  test('Test pool polling events [2]', (done) => {
    const response = [];
    poolConfigCopy.settings.blockRefreshInterval = 600;
    rpcDataCopy.previousblockhash = '1d5af7e2ad9aeccb110401761938c07a5895d85711c9c5646661a10407c82769';
    rpcDataCopy.height = 2;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Primary chain (Bitcoin) notification via RPC polling at height 2');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            nock('http://127.0.0.1:8332')
              .post('/', body => body.method === 'getblocktemplate')
              .reply(200, JSON.stringify({
                id: 'nocktest',
                error: null,
                result: rpcDataCopy,
              }));
            pool.setupBlockPolling();
          });
        });
      });
    });
  });

  test('Test pool peer events [1]', (done) => {
    const response = [];
    poolConfigCopy.p2p.enabled = false;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('p2p has been disabled in the configuration');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
          });
        });
      });
    });
  });

  test('Test pool peer events [2]', (done) => {
    const response = [];
    poolConfigCopy.primary.coin.testnet.peerMagic = false;
    poolConfigCopy.primary.recipients[0].address = 'tb1qnc0z4696tusrgscws5gvc7g2hhz99m6lrssfc2';
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('p2p cannot be enabled in testnet without peerMagic set in testnet configuration');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupTestnetData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
          });
        });
      });
    });
  });

  test('Test pool peer events [3]', (done) => {
    const response = [];
    poolConfigCopy.primary.coin.mainnet.peerMagic = false;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('p2p cannot be enabled without peerMagic set in mainnet configuration');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
          });
        });
      });
    });
  });

  test('Test pool peer events [4]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('p2p connection failed - likely incorrect p2p magic value');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.emit('connectionRejected');
          });
        });
      });
    });
  });

  test('Test pool peer events [5]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('p2p connection failed - likely incorrect host or port');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.emit('connectionFailed', true);
          });
        });
      });
    });
  });

  test('Test pool peer events [6]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('p2p had a socket error: true');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.emit('socketError', true);
          });
        });
      });
    });
  });

  test('Test pool peer events [7]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('p2p had an error: true');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.emit('error', true);
          });
        });
      });
    });
  });

  test('Test pool peer events [8]', (done) => {
    const response = [];
    rpcDataCopy.previousblockhash = '1d5af7e2ad9aeccb110401761938c07a5895d85711c9c5646661a10407c82769';
    rpcDataCopy.height = 2;
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[2][0]).toBe('debug');
        expect(response[2][1]).toBe('Block template for Bitcoin updated successfully');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.on('blockNotify', (hash) => {
              nock('http://127.0.0.1:8332')
                .post('/', body => body.method === 'getblocktemplate')
                .reply(200, JSON.stringify({
                  id: 'nocktest',
                  error: null,
                  result: rpcDataCopy,
                }));
              pool.processBlockNotify(hash);
            });
            pool.peer.emit('blockNotify', 'example hash');
          });
        });
      });
    });
  });

  test('Test pool peer events [9]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 4) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[3][0]).toBe('error');
        expect(response[3][1]).toBe('Block notify error getting block template for Bitcoin');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.on('blockNotify', (hash) => {
              nock('http://127.0.0.1:8332')
                .post('/', body => body.method === 'getblocktemplate')
                .reply(200, JSON.stringify({
                  id: 'nocktest',
                  error: true,
                  result: null,
                }));
              pool.processBlockNotify(hash);
            });
            pool.peer.emit('blockNotify', 'example hash');
          });
        });
      });
    });
  });

  test('Test pool peer events [10]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, null, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 5) {
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Block notification via p2p');
        done();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.peer.emit('blockFound', 'example hash');
          });
        });
      });
    });
  });

  test('Test pool stratum events [1]', (done) => {
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              pool.stratum.on('stopped', () => done());
              expect(typeof pool.stratum).toBe('object');
              expect(typeof pool.stratum.handleNewClient).toBe('function');
              expect(typeof pool.stratum.broadcastMiningJobs).toBe('function');
              expect(pool.stratum._eventsCount).toBe(4);
              pool.stratum.stopServer();
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [2]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('No new blocks for 60 seconds - updating transactions & rebroadcasting work');
        pool.stratum.stopServer();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              nock('http://127.0.0.1:8332')
                .post('/', body => body.method === 'getblocktemplate')
                .reply(200, JSON.stringify({
                  id: 'nocktest',
                  error: true,
                  result: null,
                }));
              pool.stratum.emit('broadcastTimeout');
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [3]', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 4) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('No new blocks for 60 seconds - updating transactions & rebroadcasting work');
        expect(response[2][0]).toBe('error');
        expect(response[2][1]).toBe('p2p connection failed - likely incorrect host or port');
        expect(response[3][0]).toBe('debug');
        expect(response[3][1]).toBe('Updated existing job for current block template');
        pool.stratum.stopServer();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              nock('http://127.0.0.1:8332')
                .post('/', body => body.method === 'getblocktemplate')
                .reply(200, JSON.stringify({
                  id: 'nocktest',
                  error: null,
                  result: rpcDataCopy,
                }));
              pool.stratum.emit('broadcastTimeout');
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [4]', (done) => {
    const response = [];
    rpcDataCopy.previousblockhash = '1d5af7e2ad9aeccb110401761938c07a5895d85711c9c5646661a10407c82769';
    rpcDataCopy.height = 2;
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 4) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('No new blocks for 60 seconds - updating transactions & rebroadcasting work');
        expect(response[2][0]).toBe('error');
        expect(response[2][1]).toBe('p2p connection failed - likely incorrect host or port');
        expect(response[3][0]).toBe('debug');
        expect(response[3][1]).toBe('Established new job for updated block template');
        pool.stratum.stopServer();
      }
    });
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              nock('http://127.0.0.1:8332')
                .post('/', body => body.method === 'getblocktemplate')
                .reply(200, JSON.stringify({
                  id: 'nocktest',
                  error: null,
                  result: rpcDataCopy,
                }));
              pool.stratum.emit('broadcastTimeout');
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [5]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Malformed message from client [example]: "Message"');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('malformedMessage', 'Message');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [6]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Socket error from client [example]: "Error"');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('socketError', 'Error');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [7]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Connection timed out for client [example]: Timeout');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('socketTimeout', 'Timeout');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [8]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Socket disconnect for client [example]');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('socketDisconnect');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [9]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Rejected incoming connection from 127.0.0.1. The client is banned for 100000 seconds.');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('kickedBannedIP', 100000);
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.remoteAddress = '127.0.0.1';
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [10]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Forgave banned IP 127.0.0.1');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('forgaveBannedIP');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.remoteAddress = '127.0.0.1';
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [11]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Unknown stratum method from client [example]: Unknown');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('unknownStratumMethod', { method: 'Unknown'});
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [12]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Detected socket flooding from client [example]');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('socketFlooded');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [13]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('error');
        expect(response[1][1]).toBe('Client IP detection failed, tcpProxyProtocol is enabled yet did not receive proxy protocol message, instead got data: Data');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('tcpProxyError', 'Data');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [14]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('warning');
        expect(response[1][1]).toBe('Ban triggered for client [example]: Socket flooding');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('triggerBan', 'Socket flooding');
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [15]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Difficulty updated successfully for worker: worker1 (100000)');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('difficultyChanged', 100000);
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.addrPrimary = 'worker1';
              client.addrAuxiliary = 'worker1';
              client.getLabel = () => {
                return 'client [example]';
              };
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [16]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Client successfully subscribed to stratum network');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('subscription', {}, () => {
        pool.emit('log', 'debug', 'Client successfully subscribed to stratum network');
      });
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              client.sendDifficulty = () => {};
              client.sendMiningJob = () => {};
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [17]', (done) => {
    let client;
    const response = [];
    delete poolConfigCopy.ports[0].difficulty.initial;
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 1) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('debug');
        expect(response[0][1]).toBe('Client successfully subscribed to stratum network');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('subscription', {}, () => {
        pool.emit('log', 'debug', 'Client successfully subscribed to stratum network');
      });
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              client.sendDifficulty = () => {};
              client.sendMiningJob = () => {};
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool stratum events [18]', (done) => {
    let client;
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 2) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Client successfully subscribed to stratum network');
        pool.stratum.stopServer();
      }
    });
    pool.on('connectionSucceeded', () => {
      client.emit('submit', {params: [0, 1, 2, 3, 4, 5]}, () => {
        pool.emit('log', 'debug', 'Client successfully subscribed to stratum network');
      });
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupPeer();
            pool.setupStratum(() => {
              const socket = new events.EventEmitter();
              client = new events.EventEmitter();
              client.previousDifficulty = 0;
              client.difficulty = 1;
              client.extraNonce1 = 0;
              client.remoteAddress = '127.0.0.1';
              client.socket = socket;
              client.socket.localPort = 3001;
              client.getLabel = () => {
                return 'client [example]';
              };
              client.sendDifficulty = () => {};
              client.sendMiningJob = () => {};
              client.asicboost = true;
              client.versionMask = '1fffe000';
              pool.stratum.emit('client.connected', client);
            });
          });
        });
      });
    });
  });

  test('Test pool info outputting', (done) => {
    const response = [];
    const pool = new Pool(poolConfigCopy, configCopy, () => {}, () => {});
    pool.on('log', (type, text) => {
      response.push([type, text]);
      if (response.length === 3) {
        pool.stratum.on('stopped', () => done());
        expect(response[0][0]).toBe('warning');
        expect(response[0][1]).toBe('Network diff of 0 is lower than port 3001 w/ diff 32');
        expect(response[1][0]).toBe('debug');
        expect(response[1][1]).toBe('Block template polling has been disabled');
        expect(response[2][0]).toBe('special');
        expect(response[2][1]).toBe('Stratum pool server started for Pool1\n\t\t\t\tCoins Connected:	Bitcoin,Namecoin\n\t\t\t\tNetwork Connected:	Mainnet\n\t\t\t\tCurrent Block Height:	1\n\t\t\t\tCurrent Connect Peers:	1\n\t\t\t\tCurrent Block Diff:	0.000244141\n\t\t\t\tNetwork Difficulty:	0\n\t\t\t\tStratum Port(s):	3001\n\t\t\t\tPool Fee Percentage:	5%');
        pool.stratum.stopServer();
      }
    });
    pool.setupDifficulty();
    mockSetupDaemon(pool, () => {
      mockSetupData(pool, () => {
        pool.setupRecipients();
        pool.setupJobManager();
        mockSetupBlockchain(pool, () => {
          mockSetupFirstJob(pool, () => {
            pool.setupBlockPolling();
            pool.setupPeer();
            pool.setupStratum(() => {
              pool.outputPoolInfo(() => {});
            });
          });
        });
      });
    });
  });
});
