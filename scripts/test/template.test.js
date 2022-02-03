/*
 *
 * templates (Updated)
 *
 */

const utils = require('../main/utils');
const Algorithms = require('../main/algorithms');
const Template = require('../main/template');

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

const poolConfig = {
  'settings': {
    'testnet': false
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'asicboost': true,
      'rewards': {},
      'version': 1,
      'algorithms': {
        'mining': 'scrypt',
        'block': 'scrypt',
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
  }
};

const jobId = 1;
const extraNonce = Buffer.from('f000000ff111111f', 'hex');

////////////////////////////////////////////////////////////////////////////////

describe('Test template functionality', () => {

  let poolConfigCopy, rpcDataCopy;
  beforeEach(() => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
  });

  test('Test current bignum implementation [1]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    expect(template.target.toNumber().toFixed(9)).toBe('1.1042625655198232e+71');
  });

  test('Test current bignum implementation [2]', () => {
    rpcDataCopy.target = null;
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    expect(template.target.toNumber().toFixed(9)).toBe('1.1042625655198232e+71');
  });

  test('Test if target is not defined', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    delete rpcDataCopy.target;
    expect(template.target.toNumber().toFixed(9)).toBe('1.1042625655198232e+71');
    expect(template.difficulty.toFixed(9)).toBe('0.000244141');
  });

  test('Test template difficulty calculation', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    expect(template.difficulty.toFixed(9)).toBe('0.000244141');
  });

  test('Test merkle step calculation', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const merkleSteps = template.merkle.steps;
    const merkleHashes = template.getMerkleHashes(merkleSteps);
    expect(merkleHashes.length).toBe(1);
    expect(merkleHashes[0]).toBe('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c');
  });

  test('Test merkle buffer calculation', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const transactions = template.rpcData.transactions;
    const merkleBuffers = template.getTransactionBuffers(transactions);
    expect(merkleBuffers.length).toBe(2);
    expect(merkleBuffers[0]).toBe(null);
    expect(merkleBuffers[1]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  // No Voting Data in the Testing template
  test('Test voting data', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    expect(template.getVoteData()).toStrictEqual(Buffer.from([]));
  });

  test('Test generation transaction creation', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const generation = template.createGeneration(poolConfigCopy, template.rpcData, extraNonce, null);
    expect(generation.length).toBe(2);
    expect(generation[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(generation[1]).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test if txid is defined in the transaction', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    rpcDataCopy.transactions[0].txid = rpcDataCopy.transactions[0].hash;
    const merkleBuffers = template.getTransactionBuffers(rpcDataCopy.transactions);
    expect(merkleBuffers.length).toBe(2);
    expect(merkleBuffers[0]).toBe(null);
    expect(merkleBuffers[1]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  test('Test if masternode voting data exists', () => {
    rpcDataCopy.masternode_payments = true;
    rpcDataCopy.votes = ['17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c'];
    const templateVoting = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const templateVotes = templateVoting.getVoteData();
    expect(templateVotes).toStrictEqual(Buffer.from('0117a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  test('Test merkle creation', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const merkle = template.createMerkle(template.rpcData, template.generation, poolConfigCopy);
    expect(merkle.steps.length).toBe(1);
    expect(merkle.steps[0]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  test('Test reversing of hashes', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    expect(template.previousblockhash).toBe('bc7727e2ee0395305fc6e36b29a60b37be7d49b6bd4c808b83ef65839719aefb');
  });

  test('Test coinbase serialization [1]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const extraNonce1 = Buffer.from('01', 'hex');
    const extraNonce2 = Buffer.from('00', 'hex');
    const coinbase = template.serializeCoinbase(extraNonce1, extraNonce2);
    expect(coinbase.slice(0, 44)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0f5104', 'hex'));
    expect(coinbase.slice(49, 51)).toStrictEqual(Buffer.from('0100', 'hex'));
    expect(coinbase.slice(51)).toStrictEqual(Buffer.from('000000000200f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900000000', 'hex'));
  });

  test('Test coinbase serialization [2]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const coinbaseHash = template.coinbaseHasher(coinbase);
    expect(coinbaseHash).toStrictEqual(Buffer.from('afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b53031', 'hex'));
  });

  test('Test merkle root generation', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const coinbaseHash = template.coinbaseHasher(coinbase);
    const merkleRoot = utils.reverseBuffer(template.merkle.withFirst(coinbaseHash)).toString('hex');
    expect(merkleRoot).toBe('0b8dcdd18969a859444b18f927f69202f5a8c4379b3ed5b3f7c1bd1f57e916d0');
  });

  test('Test header serialization [1]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const merkleRoot = '3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af';
    const time = '6036c54f'.toString('hex');
    const nonce = 'fe1a0000'.toString('hex');
    const headerBuffer = template.serializeHeader(merkleRoot, time, nonce, template.rpcData.version);
    expect(headerBuffer).toStrictEqual(Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae199700060003000008000701000100010000000908050000000001000301000000004fc53660f0ff0f1e00001afe', 'hex'));
  });

  test('Test header serialization [2]', () => {
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const hashDigest = Algorithms[poolConfig.primary.coin.algorithms.mining].hash(poolConfig.primary.coin);
    const headerHash = hashDigest(headerBuffer, 1614202191);
    expect(headerHash).toStrictEqual(Buffer.from('3748391bfdaaa2a44424028a12fa508f94bb9ca879b2430a41cfa6e171040000', 'hex'));
  });

  test('Test header serialization [3]', () => {
    poolConfigCopy.primary.coin.algorithms.mining = 'kawpow';
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const merkleRoot = '3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af';
    const time = '6036c54f'.toString('hex');
    const nonce = 'fe1a0000'.toString('hex');
    const headerBuffer = template.serializeHeader(merkleRoot, time, nonce, template.rpcData.version);
    expect(headerBuffer).toStrictEqual(Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae199700060003000008000701000100010000000908050000000001000301000000004fc53660f0ff0f1e01000000', 'hex'));
  });

  test('Test block serialization [1]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const templateHex = template.serializeBlock(headerBuffer, coinbase, null, null);
    expect(templateHex).toStrictEqual(Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe0201000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac000000000100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000', 'hex'));
  });

  test('Test block serialization [2]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const templateHash = template.blockHasher(headerBuffer, 1614202191);
    expect(templateHash).toStrictEqual(Buffer.from('00000471e1a6cf410a43b279a89cbb948f50fa128a022444a4a2aafd1b394837', 'hex'));
  });

  test('Test block serialization [3]', () => {
    poolConfigCopy.primary.coin.hybrid = true;
    poolConfigCopy.primary.pubkey = '020ba3ebc2f55152df5653bb7aba6548f0615d67b072379bdd19e72bc63c052c50';
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const templateHex = template.serializeBlock(headerBuffer, coinbase, null, null);
    expect(templateHex).toStrictEqual(Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe0201000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac000000000100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac0000000000', 'hex'));
  });

  test('Test block serialization [4]', () => {
    poolConfigCopy.primary.coin.algorithms.mining = 'kawpow';
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const headerBuffer = Buffer.from('63543d3913fe56e6720c5e61e8d208d05582875822628f483279a3e8d9c9a8b3', 'hex');
    const mixHashBuffer = Buffer.from('89732e5ff8711c32558a308fc4b8ee77416038a70995670e3eb84cbdead2e337', 'hex');
    const nonceBuffer = Buffer.from('88a23b0033eb959b', 'hex');
    const templateHex = template.serializeBlock(headerBuffer, Buffer.from('', 'hex'), nonceBuffer, mixHashBuffer);
    expect(templateHex).toStrictEqual(Buffer.from('63543d3913fe56e6720c5e61e8d208d05582875822628f483279a3e8d9c9a8b388a23b0033eb959b37e3d2eabd4cb83e0e679509a738604177eeb8c48f308a55321c71f85f2e7389020100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000', 'hex'));
  });

  test('Test template submission', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const extraNonce1 = Buffer.from('01', 'hex');
    const extraNonce2 = Buffer.from('00', 'hex');
    const time = '6036c54f'.toString('hex');
    const nonce = 'fe1a0000'.toString('hex');
    const templateSubmitted1 = template.registerSubmit([extraNonce1, extraNonce2, time, nonce]);
    const templateSubmitted2 = template.registerSubmit([extraNonce1, extraNonce2, time, nonce]);
    expect(templateSubmitted1).toBe(true);
    expect(templateSubmitted2).toBe(false);
  });

  test('Test current job parameters [1]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const jobParams = [
      template.jobId,
      template.previousblockhash,
      template.generation[0].toString('hex'),
      template.generation[1].toString('hex'),
      template.getMerkleHashes(template.merkle.steps),
      utils.packInt32BE(template.rpcData.version).toString('hex'),
      template.rpcData.bits,
      utils.packInt32BE(template.rpcData.curtime).toString('hex'),
      true
    ];
    const currentParams = template.getJobParams(null, true);
    expect(currentParams).toStrictEqual(jobParams);
  });

  test('Test current job parameters [2]', () => {
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const jobParams = [
      template.jobId,
      template.previousblockhash,
      template.generation[0].toString('hex'),
      template.generation[1].toString('hex'),
      template.getMerkleHashes(template.merkle.steps),
      utils.packInt32BE(template.rpcData.version).toString('hex'),
      template.rpcData.bits,
      utils.packInt32BE(template.rpcData.curtime).toString('hex'),
      true
    ];
    template.jobParams = jobParams;
    const currentParams = template.getJobParams(null, true);
    expect(currentParams).toStrictEqual(jobParams);
  });

  test('Test current job parameters [3]', () => {
    poolConfigCopy.primary.coin.algorithms.mining = 'kawpow';
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const jobParams = [
      template.jobId,
      null,
      '0000000000000000000000000000000000000000000000000000000000000000',
      '00000fffee8a5814c68000000000000000000000000000000000000000000000',
      true,
      template.rpcData.height,
      template.rpcData.bits
    ];
    const currentParams = template.getJobParams({ extraNonce1: '71000000' }, true);
    currentParams[1] = null;
    expect(currentParams).toStrictEqual(jobParams);
  });

  test('Test current job parameters [4]', () => {
    rpcDataCopy.height = 1395113;
    poolConfigCopy.primary.coin.algorithms.mining = 'kawpow';
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const jobParams = [
      template.jobId,
      null,
      'eeaf89f399eb3a301462d94af98532e0b70fa15bbf6b8af0a7deadaf5e11b68d',
      '00000fffee8a5814c68000000000000000000000000000000000000000000000',
      true,
      template.rpcData.height,
      template.rpcData.bits
    ];
    const currentParams = template.getJobParams({ extraNonce1: '71000000' }, true);
    currentParams[1] = null;
    expect(currentParams).toStrictEqual(jobParams);
  });

  test('Test current job parameters [5]', () => {
    rpcDataCopy.height = 1395113;
    poolConfigCopy.primary.coin.algorithms.mining = 'kawpow';
    const client = {};
    const template = new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    template.getJobParams(client, true);
    expect(client.extraNonce1).not.toBe(null);
  });

  test('Test if configuration is not supported', () => {
    rpcDataCopy.coinbase_payload = 'example';
    poolConfigCopy.auxiliary = { enabled: true };
    expect(() => {
      new Template(poolConfigCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    }).toThrow(Error);
  });
});
