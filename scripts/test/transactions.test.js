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

const poolConfig = {
  'settings': {
    'testnet': false,
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'version': 1,
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

  let poolConfigCopy, rpcDataCopy;
  beforeEach(() => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
  });

  test('Test bitcoin transaction builder [1]', () => {
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [2]', () => {
    poolConfigCopy.primary.coin.version = 3;
    rpcDataCopy.coinbase_payload = 'example coinbase payload';
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('03000500010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90000000000', 'hex'));
  });

  test('Test bitcoin transaction builder [3]', () => {
    rpcDataCopy.coinbasetxn = {};
    rpcDataCopy.coinbasetxn.data = '0400008085202';
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('04000080010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [4]', () => {
    rpcDataCopy.masternode = {};
    rpcDataCopy.masternode.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.masternode.amount = 194005101;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000393a9751e01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [5]', () => {
    rpcDataCopy.masternode = [];
    rpcDataCopy.masternode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005101 });
    rpcDataCopy.masternode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('00000000042561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [6]', () => {
    rpcDataCopy.masternode = [];
    rpcDataCopy.masternode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005101 });
    rpcDataCopy.masternode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('00000000042561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [7]', () => {
    rpcDataCopy.masternode = [];
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [8]', () => {
    rpcDataCopy.smartnode = {};
    rpcDataCopy.smartnode.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.smartnode.amount = 194005101;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000393a9751e01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [9]', () => {
    rpcDataCopy.smartnode = [];
    rpcDataCopy.smartnode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005101 });
    rpcDataCopy.smartnode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('00000000042561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [10]', () => {
    rpcDataCopy.smartnode = [];
    rpcDataCopy.smartnode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005101 });
    rpcDataCopy.smartnode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('00000000042561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [11]', () => {
    rpcDataCopy.smartnode = [];
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [12]', () => {
    rpcDataCopy.superblock = [];
    rpcDataCopy.superblock.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005101 });
    rpcDataCopy.superblock.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('00000000042561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [13]', () => {
    rpcDataCopy.superblock = [];
    rpcDataCopy.superblock.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005101 });
    rpcDataCopy.superblock.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('00000000042561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [14]', () => {
    rpcDataCopy.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.payee_amount = 194005101;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000393a9751e01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [15]', () => {
    poolConfigCopy.primary.coin.rewards = {};
    poolConfigCopy.primary.coin.rewards.type = 'raptoreum';
    rpcDataCopy.founder_payments_started = true;
    rpcDataCopy.founder = {};
    rpcDataCopy.founder.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.founder.amount = 194005101;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000393a9751e01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [16]', () => {
    poolConfigCopy.primary.coin.rewards = {};
    poolConfigCopy.primary.coin.rewards.type = 'raptoreum';
    rpcDataCopy.founder_payments_started = false;
    rpcDataCopy.founder = {};
    rpcDataCopy.founder.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.founder.amount = 194005101;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [17]', () => {
    poolConfigCopy.primary.coin.rewards = {};
    poolConfigCopy.primary.coin.rewards.type = 'hivecoin';
    rpcDataCopy.CommunityAutonomousAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    rpcDataCopy.CommunityAutonomousValue = 194005101;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000300f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [18]', () => {
    poolConfigCopy.primary.recipients.push({ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', percentage: 0.05 });
    const transaction = transactions.default(poolConfigCopy, rpcData, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('0000000003803f1f1b01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4280b2e60e00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [19]', () => {
    poolConfigCopy.primary.recipients.push({ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', percentage: 0.05 });
    poolConfigCopy.primary.recipients.push({ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', percentage: 0.05 });
    const transaction = transactions.default(poolConfigCopy, rpcData, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('0000000004008d380c01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4280b2e60e00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4280b2e60e00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [20]', () => {
    rpcDataCopy.coinbaseaux.flags = 'test';
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [21]', () => {
    rpcDataCopy.masternode = {};
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [22]', () => {
    rpcDataCopy.payee = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000300286bee00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200ca9a3b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [23]', () => {
    delete rpcDataCopy.default_witness_commitment;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000100f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test bitcoin transaction builder [24]', () => {
    poolConfigCopy.auxiliary.enabled = true;
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, auxMerkle);
    expect(transaction[0].slice(0, 44)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3b5104', 'hex'));
    expect(transaction[0].slice(49, 53)).toStrictEqual(Buffer.from('fabe6d6d', 'hex'));
    expect(transaction[0].slice(53)).toStrictEqual(Buffer.from('7c90a5087ac4d5b9361d47655812c89b4ad0dee6ecd5e08814d00ce7385aa3170200000000000000', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [25]', () => {
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, auxMerkle);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [26]', () => {
    rpcDataCopy.znode_payments_started = true;
    rpcDataCopy.znode_payments_enforced = true;
    rpcDataCopy.znode = [];
    rpcDataCopy.znode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005101 });
    rpcDataCopy.znode.push({ payee: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000400f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [27]', () => {
    rpcDataCopy.znode_payments_started = true;
    rpcDataCopy.znode_payments_enforced = true;
    rpcDataCopy.znode = [];
    rpcDataCopy.znode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005101 });
    rpcDataCopy.znode.push({ script: '0014e8df018c7e326cc253faac7e46cdc51e68542c42', amount: 194005102 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000400f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test bitcoin transaction builder [28]', () => {
    poolConfigCopy.primary.coin.rewards = {};
    poolConfigCopy.primary.coin.rewards.type = 'firocoin';
    poolConfigCopy.primary.coin.rewards.addresses = [];
    poolConfigCopy.primary.coin.rewards.addresses.push({ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: 187500000 });
    const transaction = transactions.default(poolConfigCopy, rpcDataCopy, extraNonce, null);
    expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(transaction[1]).toStrictEqual(Buffer.from('000000000300f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c42e0052d0b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

});
