/*
 *
 * Manager (Updated)
 *
 */

const Manager = require('../main/manager');
const MockDate = require('mockdate');

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

const rpcDataKawpow = {
  'capabilities': [ 'proposal' ],
  'version': 805306368,
  'rules': [
    'assets',
    'messaging_restricted',
    'transfer_script',
    'enforce_value',
    'coinbase'
  ],
  'vbavailable': {},
  'vbrequired': 0,
  'previousblockhash': '0000000427a793d87387a1b733ba46fe2bc07983d607651dd21f3c771810a9ff',
  'transactions': [],
  'coinbaseaux': { 'flags': '' },
  'coinbasevalue': 500000000000,
  'longpollid': '0000000427a793d87387a1b733ba46fe2bc07983d607651dd21f3c771810a9ff835',
  'target': '00000004f5540000000000000000000000000000000000000000000000000000',
  'mintime': 1634741701,
  'mutable': [ 'time', 'transactions', 'prevblock' ],
  'noncerange': '00000000ffffffff',
  'sigoplimit': 80000,
  'sizelimit': 8000000,
  'weightlimit': 8000000,
  'curtime': 1634742080,
  'bits': '1d04f554',
  'height': 940250,
  'default_witness_commitment': '6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9'
};

const auxData = {
  'chainid': 1,
  'hash': '8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2',
};

const poolConfig = {
  'settings': {
    'testnet': false,
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'rewards': {},
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

const poolConfigKawpow = {
  'settings': {
    'testnet': false,
  },
  'primary': {
    'address': 'mz4CVyMz8qCFXtpk8HUvKWviMgPRWZaiCB',
    'coin': {
      'version': 1,
      'rewards': {},
      'algorithms': {
        'mining': 'kawpow',
        'block': 'sha256d',
        'coinbase': 'sha256d',
      },
      'mainnet': {
        'bech32': '',
        'bip32': {
          'public': 0x043587cf,
          'private': 0x04358394,
        },
        'pubKeyHash': 0x6f,
        'scriptHash': 0xc4,
        'wif': 0xef,
        'coin': 'trvn',
      },
    },
    'recipients': [{
      'address': 'mz4CVyMz8qCFXtpk8HUvKWviMgPRWZaiCB',
      'percentage': 0.05,
    }],
  },
};

const portalConfig = {
  'settings': {
    'identifier': 'master',
  },
};

////////////////////////////////////////////////////////////////////////////////

describe('Test manager functionality', () => {

  let poolConfigCopy, poolConfigKawpowCopy, configCopy, rpcDataCopy, rpcDataKawpowCopy;
  beforeEach(() => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    poolConfigKawpowCopy = JSON.parse(JSON.stringify(poolConfigKawpow));
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
    rpcDataKawpowCopy = JSON.parse(JSON.stringify(rpcDataKawpow));
  });

  test('Test initial manager calculations', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
    expect(manager.extraNonceCounter.size).toBe(4);
    expect(manager.extraNonceCounter.next().length).toBe(8);
    expect(manager.extraNoncePlaceholder).toStrictEqual(Buffer.from('f000000ff111111f', 'hex'));
    expect(manager.extraNonce2Size).toBe(4);
  });

  test('Test job updates given auxpow initialization', () => {
    rpcDataCopy.auxData = auxData;
    const manager = new Manager(poolConfigCopy, configCopy);
    const response = manager.processTemplate(rpcDataCopy, true);
    expect(response).toBe(true);
  });

  test('Test job updates given new blockTemplate', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
    manager.updateCurrentJob(rpcData);
    expect(typeof manager.currentJob).toBe('object');
    expect(manager.currentJob.rpcData.height).toBe(1);
    expect(manager.currentJob.rpcData.previousblockhash).toBe('9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2');
    expect(typeof manager.validJobs[1]).toBe('object');
  });

  test('Test template updates given new blockTemplate [1]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
    const response1 = manager.processTemplate(rpcData, false);
    const response2 = manager.processTemplate(rpcData, false);
    expect(response1).toBe(true);
    expect(response2).toBe(false);
  });

  test('Test template updates given new blockTemplate [2]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
    const response1 = manager.processTemplate(rpcDataCopy, false);
    rpcDataCopy.previousblockhash = '8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2';
    const response2 = manager.processTemplate(rpcDataCopy, false);
    expect(response1).toBe(true);
    expect(response2).toBe(true);
  });

  test('Test template updates given new blockTemplate [3]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
    const response1 = manager.processTemplate(rpcDataCopy, false);
    rpcDataCopy.previousblockhash = '8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2';
    rpcDataCopy.height = 0;
    const response2 = manager.processTemplate(rpcDataCopy, false);
    expect(response1).toBe(true);
    expect(response2).toBe(false);
  });

  test('Test share submission process [1]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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
    const manager = new Manager(poolConfigCopy, configCopy);
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
    const manager = new Manager(poolConfigCopy, configCopy);
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
    const manager = new Manager(poolConfigCopy, configCopy);
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
    const manager = new Manager(poolConfigCopy, configCopy);
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
    const manager = new Manager(poolConfigCopy, configCopy);
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
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', null, null, submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('worker address isn\'t set properly');
  });

  test('Test share submission process [7]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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

  test('Test share submission process [8]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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

  test('Test share submission process [9]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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

  test('Test share submission process [10]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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

  test('Test share submission process [11]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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

  test('Test share submission process [12]', () => {
    const manager = new Manager(poolConfigCopy, configCopy);
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

  test('Test share submission process [13]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: 0,
      nonce: '00',
      headerHash: '00',
      mixHash: '00',
    };
    const response = manager.processShare(0, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(21);
    expect(response.error[1]).toBe('job not found');
  });

  test('Test share submission process [14]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: 0,
      nonce: '00',
      headerHash: 'xxxx',
      mixHash: '00',
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('invalid header submission [1]');
  });

  test('Test share submission process [15]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: 0,
      nonce: '00',
      headerHash: '00',
      mixHash: 'xxxx',
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('invalid mixHash submission');
  });

  test('Test share submission process [16]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: 0,
      nonce: 'xxxx',
      headerHash: '00',
      mixHash: '00',
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('invalid nonce submission');
  });

  test('Test share submission process [17]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: 0,
      nonce: 'xxxx',
      headerHash: '00',
      mixHash: '00',
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('invalid nonce submission');
  });

  test('Test share submission process [18]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: '1952',
      nonce: '19522aaaad98a7ec',
      headerHash: '4c3ec261b8b84f36ffadad0f07b007748866d422c1c8006ccce526ad67088fe7',
      mixHash: '9d82ca253ae7011b8f9f2e12cba5a4373134197b89b5c9ecf6913f3c7d0bc45caa'
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('incorrect size of mixHash');
  });

  test('Test share submission process [19]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: '1952',
      nonce: '19522aaaad98a7ecaa',
      headerHash: '4c3ec261b8b84f36ffadad0f07b007748866d422c1c8006ccce526ad67088fe7',
      mixHash: '9d82ca253ae7011b8f9f2e12cba5a4373134197b89b5c9ecf6913f3c7d0bc45c'
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('incorrect size of nonce');
  });

  test('Test share submission process [20]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: '00',
      nonce: '19522aaaad98a7ec',
      headerHash: '4c3ec261b8b84f36ffadad0f07b007748866d422c1c8006ccce526ad67088fe7',
      mixHash: '9d82ca253ae7011b8f9f2e12cba5a4373134197b89b5c9ecf6913f3c7d0bc45c'
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(24);
    expect(response.error[1]).toBe('nonce out of worker range');
  });

  test('Test share submission process [21]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: 'b750',
      nonce: 'b7502aaaac75284c',
      headerHash: 'a940277ad64417e5d645d884522f66d733cfc91ab0a87b32d6400ed28c6b8f2e',
      mixHash: 'ab1957f31544c9a133eebccdd30dfefc3deda8ab3015aa12aac8b164346152ab'
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', null, null, submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('worker address isn\'t set properly');
  });

  test('Test share submission process [22]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: '1952',
      nonce: '19522aaaad98a7ec',
      headerHash: '4c3ec261b8b84f36ffadad0f07b007748866d422c1c8006ccce526ad67088fe7',
      mixHash: '9d82ca253ae7011b8f9f2e12cba5a4373134197b89b5c9ecf6913f3c7d0bc45c'
    };
    manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(22);
    expect(response.error[1]).toBe('duplicate share');
  });

  test('Test share submission process [23]', () => {
    MockDate.set(1634742080841);
    const manager = new Manager(poolConfigKawpowCopy, configCopy);
    manager.processTemplate(rpcDataKawpowCopy, false);
    const submission = {
      extraNonce1: '1952',
      nonce: '19522aaaad98a7ec',
      headerHash: '3c3ec261b8b84f36ffadad0f07b007748866d422c1c8006ccce526ad67088fe7',
      mixHash: '9d82ca253ae7011b8f9f2e12cba5a4373134197b89b5c9ecf6913f3c7d0bc45c'
    };
    const response = manager.processShare(1, 0, 0, 'ip_addr', 'port', 'addr1', 'addr2', submission);
    expect(response.error[0]).toBe(20);
    expect(response.error[1]).toBe('invalid header submission [2]');
  });
});
