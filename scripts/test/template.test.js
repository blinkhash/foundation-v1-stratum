/*
 *
 * Blocks (Updated)
 *
 */

const utils = require('../main/utils');
const Algorithms = require('../main/algorithms');
const Manager = require('../main/manager');
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

const options = {
  'settings': {
    'testnet': false
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'asicBoost': true,
      'rewards': '',
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
const manager = new Manager(options);

////////////////////////////////////////////////////////////////////////////////

describe('Test block functionality', () => {

  test('Test current bignum implementation [1]', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    expect(block.target.toNumber().toFixed(9)).toBe('1.1042625655198232e+71');
  });

  test('Test current bignum implementation [2]', () => {
    const rpcDataCopy = Object.assign({}, rpcData);
    rpcDataCopy.target = null;
    const block = new Template(jobId.toString(16), rpcDataCopy, extraNonce, null, options);
    expect(block.target.toNumber().toFixed(9)).toBe('1.1042625655198232e+71');
  });

  test('Test if target is not defined', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const rpcTarget = JSON.parse(JSON.stringify(rpcData));
    delete rpcTarget.target;
    expect(block.target.toNumber().toFixed(9)).toBe('1.1042625655198232e+71');
    expect(block.difficulty.toFixed(9)).toBe('0.000244141');
  });

  test('Test block difficulty calculation', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    expect(block.difficulty.toFixed(9)).toBe('0.000244141');
  });

  test('Test merkle step calculation', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const merkleSteps = block.merkle.steps;
    const merkleHashes = block.getMerkleHashes(merkleSteps);
    expect(merkleHashes.length).toBe(1);
    expect(merkleHashes[0]).toBe('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c');
  });

  test('Test merkle buffer calculation', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const transactions = block.rpcData.transactions;
    const merkleBuffers = block.getTransactionBuffers(transactions);
    expect(merkleBuffers.length).toBe(2);
    expect(merkleBuffers[0]).toBe(null);
    expect(merkleBuffers[1]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  // No Voting Data in the Testing Block
  test('Test voting data', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    expect(block.getVoteData()).toStrictEqual(Buffer.from([]));
  });

  test('Test generation transaction creation', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const generation = block.createGeneration(block.rpcData, extraNonce, null, options);
    expect(generation.length).toBe(2);
    expect(generation[0].slice(0, -5)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(generation[1]).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test if txid is defined in the transaction', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const rpcTxid = JSON.parse(JSON.stringify(rpcData));
    rpcTxid.transactions[0].txid = rpcTxid.transactions[0].hash;
    const merkleBuffers = block.getTransactionBuffers(rpcTxid.transactions);
    expect(merkleBuffers.length).toBe(2);
    expect(merkleBuffers[0]).toBe(null);
    expect(merkleBuffers[1]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  test('Test if masternode voting data exists', () => {
    const rpcMasternodes = JSON.parse(JSON.stringify(rpcData));
    rpcMasternodes.masternode_payments = true;
    rpcMasternodes.votes = ['17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c'];
    const blockVoting = new Template(jobId.toString(16), rpcMasternodes, extraNonce, null, options);
    const blockVotes = blockVoting.getVoteData();
    expect(blockVotes).toStrictEqual(Buffer.from('0117a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  test('Test merkle creation', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const merkle = block.createMerkle(block.rpcData, block.generation, options);
    expect(merkle.steps.length).toBe(1);
    expect(merkle.steps[0]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
  });

  test('Test reversing of hashes', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    expect(block.previousblockhash).toBe('bc7727e2ee0395305fc6e36b29a60b37be7d49b6bd4c808b83ef65839719aefb');
  });

  test('Test coinbase serialization [1]', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const extraNonce1 = Buffer.from('01', 'hex');
    const extraNonce2 = Buffer.from('00', 'hex');
    const coinbase = block.serializeCoinbase(extraNonce1, extraNonce2);
    expect(coinbase.slice(0, 44)).toStrictEqual(Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3e5104', 'hex'));
    expect(coinbase.slice(49, 51)).toStrictEqual(Buffer.from('0100', 'hex'));
    expect(coinbase.slice(51)).toStrictEqual(Buffer.from('2e68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f666f756e646174696f6e2d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000', 'hex'));
  });

  test('Test coinbase serialization [2]', () => {
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const coinbaseHash = manager.coinbaseHasher(coinbase);
    expect(coinbaseHash).toStrictEqual(Buffer.from('afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b53031', 'hex'));
  });

  test('Test merkle root generation', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const coinbaseHash = manager.coinbaseHasher(coinbase);
    const merkleRoot = utils.reverseBuffer(block.merkle.withFirst(coinbaseHash)).toString('hex');
    expect(merkleRoot).toBe('0b8dcdd18969a859444b18f927f69202f5a8c4379b3ed5b3f7c1bd1f57e916d0');
  });

  test('Test header serialization [1]', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const merkleRoot = '3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af';
    const time = '6036c54f'.toString('hex');
    const nonce = 'fe1a0000'.toString('hex');
    const headerBuffer = block.serializeHeader(merkleRoot, time, nonce, block.rpcData.version);
    expect(headerBuffer).toStrictEqual(Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex'));
  });

  test('Test header serialization [2]', () => {
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const hashDigest = Algorithms[options.primary.coin.algorithms.mining].hash(options.primary.coin);
    const headerHash = hashDigest(headerBuffer, 1614202191);
    expect(headerHash).toStrictEqual(Buffer.from('3748391bfdaaa2a44424028a12fa508f94bb9ca879b2430a41cfa6e171040000', 'hex'));
  });

  test('Test block serialization [1]', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000', 'hex');
    const blockHex = block.serializeBlock(headerBuffer, coinbase);
    expect(blockHex).toStrictEqual(Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe0201000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac000000000100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000', 'hex'));
  });

  test('Test block serialization [2]', () => {
    const headerBuffer = Buffer.from('00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b530314fc53660f0ff0f1e00001afe', 'hex');
    const blockHash = manager.blockHasher(headerBuffer, 1614202191);
    expect(blockHash).toStrictEqual(Buffer.from('00000471e1a6cf410a43b279a89cbb948f50fa128a022444a4a2aafd1b394837', 'hex'));
  });

  test('Test block submission', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const extraNonce1 = Buffer.from('01', 'hex');
    const extraNonce2 = Buffer.from('00', 'hex');
    const time = '6036c54f'.toString('hex');
    const nonce = 'fe1a0000'.toString('hex');
    const blockSubmitted1 = block.registerSubmit([extraNonce1, extraNonce2, time, nonce]);
    const blockSubmitted2 = block.registerSubmit([extraNonce1, extraNonce2, time, nonce]);
    expect(blockSubmitted1).toBe(true);
    expect(blockSubmitted2).toBe(false);
  });

  test('Test current job parameters', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const jobParams = [
      block.jobId,
      block.previousblockhash,
      block.generation[0].toString('hex'),
      block.generation[1].toString('hex'),
      block.getMerkleHashes(block.merkle.steps),
      utils.packInt32BE(block.rpcData.version).toString('hex'),
      block.rpcData.bits,
      utils.packInt32BE(block.rpcData.curtime).toString('hex'),
      true
    ];
    const currentParams = block.getJobParams();
    expect(currentParams).toStrictEqual(jobParams);
  });

  test('Test if block jobParams already exists', () => {
    const block = new Template(jobId.toString(16), rpcData, extraNonce, null, options);
    const jobParams = [
      block.jobId,
      block.previousblockhash,
      block.generation[0].toString('hex'),
      block.generation[1].toString('hex'),
      block.getMerkleHashes(block.merkle.steps),
      utils.packInt32BE(block.rpcData.version).toString('hex'),
      block.rpcData.bits,
      utils.packInt32BE(block.rpcData.curtime).toString('hex'),
      true
    ];
    block.jobParams = jobParams;
    const currentParams = block.getJobParams();
    expect(currentParams).toStrictEqual(jobParams);
  });
});
