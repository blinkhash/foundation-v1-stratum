/*
 *
 * Transactions (Updated)
 *
 */

const Merkle = require('../main/merkle');
const Transactions = require('../main/transactions');

const rpcData = {
  'capabilities': [
    'proposal'
  ],
  'version': 536870912,
  'rules': [],
  'vbavailable': {},
  'vbrequired': 0,
  'previousblockhash': '9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2',
  'transactions': [],
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
      'testnet': {
        'bech32': 'tbc',
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
    'enabled': false,
    'coin': {
      'header': 'fabe6d6d',
    }
  }
};

const merkleData = [
  null,
  Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
];

const auxMerkle = new Merkle(merkleData);
const extraNonce = Buffer.from('f000000ff111111f', 'hex');
const transactions = new Transactions();

////////////////////////////////////////////////////////////////////////////////

describe('Test transactions functionality', () => {

  let optionsCopy, rpcDataCopy;
  beforeEach(() => {
    optionsCopy = JSON.parse(JSON.stringify(options));
    rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
  });

  test('Test bitcoin transaction builder [1]', () => {
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [2]', () => {
    rpcDataCopy.coinbase_payload = 'example coinbase payload';
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('03000500010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000', 'hex'));
  });

  test('Test bitcoin transaction builder [3]', () => {
    rpcDataCopy.coinbasetxn = {};
    rpcDataCopy.coinbasetxn.data = '0400008085202';
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('04000080010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [4]', () => {
    rpcDataCopy.masternode = {};
    rpcDataCopy.masternode.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.masternode.payee_amount = 194005101;
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [5]', () => {
    rpcDataCopy.masternode = [];
    rpcDataCopy.masternode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005101 });
    rpcDataCopy.masternode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005102 });
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [6]', () => {
    rpcDataCopy.masternode = [];
    rpcDataCopy.masternode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005101 });
    rpcDataCopy.masternode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005102 });
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [7]', () => {
    rpcDataCopy.superblock = [];
    rpcDataCopy.superblock.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005101 });
    rpcDataCopy.superblock.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005102 });
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [8]', () => {
    rpcDataCopy.superblock = [];
    rpcDataCopy.superblock.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005101 });
    rpcDataCopy.superblock.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005102 });
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [9]', () => {
    rpcDataCopy.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.payee_amount = 194005101;
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf993a9751e01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [10]', () => {
    optionsCopy.primary.recipients.push({ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', percentage: 0.05 });
    const transaction = transactions.bitcoin(rpcData, extraNonce, null, optionsCopy);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9803f1f1b01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4280b2e60e00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [11]', () => {
    optionsCopy.primary.coin.staking = true;
    optionsCopy.primary.pubkey = '020ba3ebc2f55152df5653bb7aba6548f0615d67b072379bdd19e72bc63c052c50';
    const transaction = transactions.bitcoin(rpcData, extraNonce, null, optionsCopy);
    expect(transaction[0].slice(0, 4)).toStrictEqual(Buffer.from('01000000', 'hex'));
    expect(transaction[0].slice(8, -5)).toStrictEqual(Buffer.from('010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a010000002321020ba3ebc2f55152df5653bb7aba6548f0615d67b072379bdd19e72bc63c052c50ac00000000', 'hex'));
  });

  test('Test bitcoin transaction builder [12]', () => {
    optionsCopy.primary.coin.messages = true;
    const transaction = transactions.bitcoin(rpcData, extraNonce, null, optionsCopy);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c42000000002e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d736572766572', 'hex'));
  });

  test('Test bitcoin transaction builder [13]', () => {
    rpcDataCopy.coinbaseaux.flags = 'test';
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [14]', () => {
    rpcDataCopy.masternode = {};
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [15]', () => {
    rpcDataCopy.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900286bee00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200ca9a3b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [16]', () => {
    delete rpcDataCopy.default_witness_commitment;
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, null, options);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d736572766572000000000100f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [17]', () => {
    optionsCopy.auxiliary.enabled = true;
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, auxMerkle, optionsCopy);
    expect(transaction[0].slice(0, 44)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff6a5104', 'hex'));
    expect(transaction[0].slice(49, 53)).toStrictEqual(Buffer.from('fabe6d6d', 'hex'));
    expect(transaction[0].slice(53)).toStrictEqual(Buffer.from('7c90a5087ac4d5b9361d47655812c89b4ad0dee6ecd5e08814d00ce7385aa3170200000000000000', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [18]', () => {
    const transaction = transactions.bitcoin(rpcDataCopy, extraNonce, auxMerkle, optionsCopy);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });
});
