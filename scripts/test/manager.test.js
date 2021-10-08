/*
 *
 * Manager (Updated)
 *
 */

const Manager = require('../main/manager');

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
};

const options = {
  'settings': {
    'testnet': false,
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'rewards': '',
      'algorithms': {
        'mining': 'scrypt',
        'block': 'sha256d',
        'coinbase': 'sha256d',
      },
      'mainnet': {
        'bech32': 'bc',
        'bip32': {
          'public': 0x0488b21e,
          'private': 0x0488ade4,
        },
        'pubKeyHash': 0x00,
        'scriptHash': 0x05,
        'wif': 0x80,
        'coin': 'btc',
      },
    },
    'recipients': [],
  },
  'auxiliary': {
    'coin': {
      'header': 'fabe6d6d'
    }
  }
};

////////////////////////////////////////////////////////////////////////////////

describe('Test manager functionality', () => {

  let optionsCopy, manager;
  beforeEach(() => {
    optionsCopy = JSON.parse(JSON.stringify(options));
    manager = new Manager(optionsCopy);
  });

  test('Test initial manager calculations', () => {
    expect(manager.jobCounter.cur()).toBe('0');
    expect(manager.jobCounter.next()).toBe('1');
    expect(manager.extraNonceCounter.size).toBe(4);
    expect(manager.extraNonceCounter.next().length).toBe(8);
    expect(manager.extraNoncePlaceholder).toStrictEqual(Buffer.from('f000000ff111111f', 'hex'));
    expect(manager.extraNonce2Size).toBe(4);
  });

  test('Test jobCounter looping when counter overflows', () => {
    manager.jobCounter.counter = 65534;
    expect(manager.jobCounter.next()).toBe('1');
  });

  test('Test job updates given auxpow initialization', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    rpcDataCopy.auxData = auxData;
    const response = manager.processTemplate(rpcDataCopy, true);
    expect(response).toBe(true);
  });

  test('Test job updates given new blockTemplate', () => {
    manager.updateCurrentJob(rpcData);
    expect(typeof manager.currentJob).toBe('object');
    expect(manager.currentJob.rpcData.height).toBe(1);
    expect(manager.currentJob.rpcData.previousblockhash).toBe('9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2');
    expect(typeof manager.validJobs[1]).toBe('object');
  });

  test('Test template updates given new blockTemplate [1]', () => {
    const response1 = manager.processTemplate(rpcData, false);
    const response2 = manager.processTemplate(rpcData, false);
    expect(response1).toBe(true);
    expect(response2).toBe(false);
  });

  test('Test template updates given new blockTemplate [2]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    const response1 = manager.processTemplate(rpcDataCopy, false);
    rpcDataCopy.previousblockhash = '8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2';
    const response2 = manager.processTemplate(rpcDataCopy, false);
    expect(response1).toBe(true);
    expect(response2).toBe(true);
  });

  test('Test template updates given new blockTemplate [3]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    const response1 = manager.processTemplate(rpcDataCopy, false);
    rpcDataCopy.previousblockhash = '8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2';
    rpcDataCopy.height = 0;
    const response2 = manager.processTemplate(rpcDataCopy, false);
    expect(response1).toBe(true);
    expect(response2).toBe(false);
  });

  test('Test share submission process [1]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: 0,
      extraNonce2: '00'.toString('hex'),
      nTime: 0,
      nonce: 0,
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('incorrect size of extranonce2');
  });

  test('Test share submission process [2]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: 0,
      extraNonce2: '00000000'.toString('hex'),
      nTime: 0,
      nonce: 0,
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(0, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(21);
    expect(response.error[1]).toBe('job not found');
  });

  test('Test share submission process [3]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: 0,
      extraNonce2: '00000000'.toString('hex'),
      nTime: '00'.toString('hex'),
      nonce: 0,
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('incorrect size of ntime');
  });

  test('Test share submission process [4]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: 0,
      extraNonce2: '00000000'.toString('hex'),
      nTime: '7036c54f'.toString('hex'),
      nonce: 0,
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('ntime out of range');
  });

  test('Test share submission process [5]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: 0,
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: '00'.toString('hex'),
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('incorrect size of nonce');
  });

  test('Test share submission process [6]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: '00000001'.toString('hex'),
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: 'fe1a0000'.toString('hex'),
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 0.0000001, 0.0000001, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(typeof response.hash).toBe('string');
  });

  test('Test share submission process [7]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: '00000001'.toString('hex'),
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: 'fe1a0000'.toString('hex'),
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    manager.processShare(1, 0.0000001, 0.0000001, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    const response = manager.processShare(1, 0.0000001, 0.0000001, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(22);
    expect(response.error[1]).toBe('duplicate share');
  });

  test('Test share submission process [8]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: '00000001'.toString('hex'),
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: 'fe1a0000'.toString('hex'),
      versionBit: '20000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 0.0000001, 0.0000001, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('invalid version bit');
  });

  test('Test share submission process [9]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: '00000001'.toString('hex'),
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: 'fe1a0000'.toString('hex'),
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: true,
    };
    const response = manager.processShare(1, 1, 1, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(23);
    expect(response.error[1].slice(0, 23)).toBe('low difficulty share of');
  });

  test('Test share submission process [10]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: '00000001'.toString('hex'),
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: 'fe1a0000'.toString('hex'),
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: false,
    };
    const response = manager.processShare(1, 1, 1, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(23);
    expect(response.error[1].slice(0, 23)).toBe('low difficulty share of');
  });

  test('Test share submission process [11]', () => {
    const rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    manager.processTemplate(rpcDataCopy, false);
    const submission = {
      extraNonce1: '00000001'.toString('hex'),
      extraNonce2: '00000000'.toString('hex'),
      nTime: '6036c54f'.toString('hex'),
      nonce: 'fe1a0000'.toString('hex'),
      versionBit: '00000000',
      versionMask: '1fffe000',
      asicboost: false,
    };
    const response = manager.processShare(1, 0.0000001, 1, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(typeof response.hash).toBe('string');
  });
});
