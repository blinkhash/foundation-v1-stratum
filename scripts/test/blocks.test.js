const BlockTemplate = require('../main/blocks');

const jobId = 1
const rpcData = {
    "version": 2,
    "previousblockhash": "00000000000000075f2f454573766ffae69fe41d6c7ccfcabbf8588fcd80ed52",
    "transactions": [
        {
            "data": "0100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000",
            "hash": "7c90a5087ac4d5b9361d47655812c89b4ad0dee6ecd5e08814d00ce7385aa317",
            "depends": [],
            "fee": 10000,
            "sigops": 2
        },
    ],
    "coinbaseaux": {
        "flags": "062f503253482f"
    },
    "coinbasevalue": 2501100000,
    "target": "0000000000000026222200000000000000000000000000000000000000000000",
    "mintime": 1379549850,
    "mutable": ["time", "transactions", "prevblock"],
    "noncerange": "00000000ffffffff",
    "sigoplimit": 20000,
    "sizelimit": 1000000,
    "curtime": 1379553872,
    "bits": "19262222",
    "height": 258736
}

const extraNonce = Buffer.from('f000000ff111111f', 'hex')
const options = {
    "coin": {
        "algorithm": "scrypt"
    },
    "network": {
        "network": "btc",
        "bech32": "bc",
        "bip32": {
            "public": "0488B21E"
        },
        "pubKeyHash": "00",
        "scriptHash": "05"
    },
    "poolAddress": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "recipients": [],
    "rewards": {
        "rewardType": ""
    }
}

const blockBitcoin = new BlockTemplate(jobId.toString(16), rpcData, extraNonce, options);

////////////////////////////////////////////////////////////////////////////////

describe('Test Bitcoin-type block implementation', () => {
    test('Test current bignum implementation', () => {
        expect(blockBitcoin.target.toNumber().toFixed(9)).toBe("2.3936680007194925e+59");
    });

    test('Test block difficulty calculation', () => {
        expect(blockBitcoin.difficulty).toBe(112628548.66634709);
    });

    test('Test merkle step calculation', () => {
        const merkleSteps = blockBitcoin.merkle.steps;
        const merkleHashes = blockBitcoin.getMerkleHashes(merkleSteps);
        expect(merkleHashes.length).toBe(1);
        expect(merkleHashes[0]).toBe('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c')
    });

    test('Test merkle buffer calculation', () => {
        const transactions = rpcData.transactions;
        const merkleBuffers = blockBitcoin.getTransactionBuffers(transactions);
        expect(merkleBuffers.length).toBe(2);
        expect(merkleBuffers[0]).toBe(null);
        expect(merkleBuffers[1]).toStrictEqual(Buffer.from("17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c", "hex"))
    });

    test('Test empty voting data', () => {
        expect(blockBitcoin.getVoteData()).toStrictEqual(Buffer.from([]));
    });

    test('Test generation transaction creation', () => {
        const generation = blockBitcoin.createGeneration(rpcData, extraNonce, options);
        expect(generation.length).toBe(2);
        expect(generation[0][0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4703b0f203062f503253482f04", "hex"))
        expect(generation[0][1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000010000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"))
        expect(generation[1]).toBe(null);
    });

    test('Test merkle creation', () => {
        const merkle = blockBitcoin.createMerkle(rpcData, blockBitcoin.generation, options);
        expect(merkle.data.length).toBe(2);
        expect(merkle.data[0]).toBe(null);
        expect(merkle.data[1]).toStrictEqual(Buffer.from("17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c", "hex"))
        expect(merkle.steps[0]).toStrictEqual(Buffer.from("17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c", "hex"))
    });

    test('Test reversing of hashes', () => {
        expect(blockBitcoin.prevHashReversed).toBe("cd80ed52bbf8588f6c7ccfcae69fe41d73766ffa5f2f45450000000700000000");
        expect(blockBitcoin.hashReserved).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    });

    test('Test coinbase serialization', () => {

    });
});

describe('Test ZCash-type block implementation', () => {

});
