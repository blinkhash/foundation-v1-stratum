/*
 *
 * Blocks (Updated)
 *
 */

// Import Required Modules
const util = require('../main/util');

// Import Required Modules
const Algorithms = require('../main/algorithms');
const BlockTemplate = require('../main/blocks');
const JobManager = require('../main/manager');

const jobId = 1
const extraNonce = Buffer.from('f000000ff111111f', 'hex')

const rpcBlock = {
    "hash": "1d5af7e2ad9aeccb110401761938c07a5895d85711c9c5646661a10407c82769",
    "confirmations": 1,
    "strippedsize": 168,
    "size": 168,
    "weight": 672,
    "height": 1,
    "version": 536870912,
    "versionHex": "20000000",
    "merkleroot": "3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af",
    "tx": [
        "3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af"
    ],
    "time": 1614202191,
    "mediantime": 1614202191,
    "nonce": 4263116800,
    "bits": "1e0ffff0",
    "difficulty": 0.000244140625,
    "chainwork": "0000000000000000000000000000000000000000000000000000000000200020",
    "nTx": 1,
    "previousblockhash": "9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2"
}

const rpcCoinbase = {
    "txid": "3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af",
    "hash": "3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af",
    "version": 1,
    "size": 87,
    "vsize": 87,
    "weight": 348,
    "locktime": 0,
    "vin": [
        {
            "coinbase": "0101",
            "sequence": 4294967295
        }
    ],
    "vout": [
        {
            "value": 50.00000000,
            "n": 0,
            "scriptPubKey": {
                "asm": "OP_DUP OP_HASH160 614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb OP_EQUALVERIFY OP_CHECKSIG",
                "hex": "76a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac",
                "reqSigs": 1,
                "type": "pubkeyhash",
                "addresses": [
                    "LU6RcckTW9FT33RV3Q9YYMMAN7KA9TQCQA"
                ]
            }
        }
    ],
    "hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000",
    "blockhash": "1d5af7e2ad9aeccb110401761938c07a5895d85711c9c5646661a10407c82769",
    "confirmations": 1,
    "time": 1614202191,
    "blocktime": 1614202191
}


const rpcData = {
    "capabilities": [
        "proposal"
    ],
    "version": 536870912,
    "rules": [],
    "vbavailable": {},
    "vbrequired": 0,
    "previousblockhash": "9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2",
    "transactions": [],
    "coinbaseaux": {
        "flags": ""
    },
    "coinbasevalue": 5000000000,
    "longpollid": "9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e22",
    "target": "00000ffff0000000000000000000000000000000000000000000000000000000",
    "mintime": 1614044921,
    "mutable": [
        "time",
        "transactions",
        "prevblock"
    ],
    "noncerange": "00000000ffffffff",
    "sigoplimit": 20000,
    "sizelimit": 1000000,
    "curtime": 1614201893,
    "bits": "1e0ffff0",
    "height": 1,
    "default_witness_commitment": "6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9"
}

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

const manager = new JobManager(options);
const block = new BlockTemplate(jobId.toString(16), rpcData, extraNonce, options);

////////////////////////////////////////////////////////////////////////////////

describe('Test Bitcoin-type block implementation', () => {

    test('Test current bignum implementation', () => {
        expect(block.target.toNumber().toFixed(9)).toBe("1.1042625655198232e+71");
    });

    test('Test block difficulty calculation', () => {
        expect(block.difficulty.toFixed(9)).toBe("0.000244141");
    });

    test('Test merkle step calculation', () => {
        const merkleSteps = block.merkle.steps;
        const merkleHashes = block.getMerkleHashes(merkleSteps);
        // No Transactions in the Testing Block
        expect(merkleHashes.length).toBe(0);
    });

    test('Test merkle buffer calculation', () => {
        const transactions = block.rpcData.transactions;
        const merkleBuffers = block.getTransactionBuffers(transactions);
        // No Transactions in the Testing Block
        expect(merkleBuffers.length).toBe(1);
        expect(merkleBuffers[0]).toStrictEqual(null);
    });

    test('Test voting data', () => {
        // No Voting Data in the Testing Block
        expect(block.getVoteData()).toStrictEqual(Buffer.from([]));
    });

    test('Test generation transaction creation', () => {
        const generation = block.createGeneration(block.rpcData, extraNonce, options);
        expect(generation.length).toBe(2);
        expect(generation[0][0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(generation[0][1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
        expect(generation[1]).toBe(null);
    });

    test('Test merkle creation', () => {
        const merkle = block.createMerkle(block.rpcData, block.generation, options);
        // No Transactions in the Testing Block
        expect(merkle.data.length).toBe(1);
        expect(merkle.data[0]).toBe(null);
        expect(merkle.steps.length).toBe(0);
    });

    test('Test reversing of hashes', () => {
        expect(block.prevHashReversed).toBe("bc7727e2ee0395305fc6e36b29a60b37be7d49b6bd4c808b83ef65839719aefb");
        expect(block.hashReserved).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    });

    test('Test coinbase serialization', () => {
        const extraNonce1 = Buffer.from("01", "hex");
        const extraNonce2 = Buffer.from("00", "hex");
        const coinbase = block.serializeCoinbase(extraNonce1, extraNonce2, options)
        expect(coinbase.slice(0, 44)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(coinbase.slice(49, 51)).toStrictEqual(Buffer.from("0100", "hex"));
        expect(coinbase.slice(51)).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test coinbase serialization [2]', () => {
        const coinbase = Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000", "hex");
        const coinbaseHash = manager.coinbaseHasher(coinbase);
        expect(coinbaseHash).toStrictEqual(Buffer.from("afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b53031", "hex"))
    });

    test('Test merkle root generation', () => {
        const coinbase = Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000", "hex");
        const coinbaseHash = manager.coinbaseHasher(coinbase);
        const merkleRoot = util.reverseBuffer(block.merkle.withFirst(coinbaseHash)).toString('hex');
        expect(merkleRoot).toBe("3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af");
    });

    test('Test header serialization [1]', () => {
        const merkleRoot = "3130b519a5914d1eea42022f592802c2d6b3e08b71f101aca985ff0b1031d0af";
        const headerBuffer = block.serializeHeader(merkleRoot, rpcBlock.time.toString(), rpcBlock.nonce.toString(), options);

        console.log(merkleRoot);
        console.log(rpcBlock.time);
        console.log(rpcBlock.time.toString());
        console.log(rpcBlock.nonce);
        console.log(rpcBlock.nonce.toString());

        expect(headerBuffer).toStrictEqual(Buffer.from("00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b5303121201416f0ff0f1e68116342", "hex"));
    });

    // test('Test header serialization [2]', () => {
    //     const headerBuffer = Buffer.from("00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b5303121201416f0ff0f1e68116342", "hex");
    //     const hashDigest = Algorithms[options.coin.algorithm].hash(options.coin);
    //     const headerHash = hashDigest(headerBuffer, parseInt(rpcBlock.time, 16));
    //     expect(headerHash).toStrictEqual(Buffer.from("9e6fed142fbad7942134319902fc2307bc7c20555c846bd7debc97ca7da7fea0", "hex"));
    // });
    //
    // test('Test block serialization [1]', () => {
    //     const headerBuffer = Buffer.from("00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b5303121201416f0ff0f1e68116342", "hex");
    //     const coinbase = Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000", "hex");
    //     const blockHex = block.serializeBlock(headerBuffer, coinbase, options);
    //     //console.log(blockHex.toString('hex'));
    //     //expect(blockHex).toStrictEqual(Buffer.from("9e6fed142fbad7942134319902fc2307bc7c20555c846bd7debc97ca7da7fea00101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff020101ffffffff0100f2052a010000001976a914614ca2f0f4baccdd63f45a0e0e0ff7ffb88041fb88ac00000000", "hex"));
    // });
    //
    // test('Test block serialization [2]', () => {
    //     const header = Buffer.from("00000020e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b5303121201416f0ff0f1e68116342", "hex");
    //     const blockHash = manager.blockHasher(header, parseInt(rpcBlock.time, 16));
    //     //console.log(blockHash.toString('hex'));
    // });
});

describe('Test ZCash-type block implementation', () => {

});
