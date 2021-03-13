/*
 *
 * Transactions (Updated)
 *
 */

// Import Required Modules
const util = require('../main/util');

// Import Required Modules
const Transactions = require('../main/transactions');

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
        "algorithm": "scrypt",
    },
    "network": {
        "messagePrefix": "\x18Bitcoin Signed Message:\n",
        "bech32": "bc",
        "bip32": {
            "public": 0x0488b21e,
            "private": 0x0488ade4,
        },
        "pubKeyHash": 0x00,
        "scriptHash": 0x05,
        "wif": 0x80,
        "coin": "btc",
    },
    "poolAddress": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "recipients": [],
    "rewards": "",
}

const extraNonce = Buffer.from('f000000ff111111f', 'hex')
const transactions = new Transactions();

////////////////////////////////////////////////////////////////////////////////

describe('Test transactions functionality', () => {

    test('Test bitcoin transaction builder [1]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [2]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.coinbase_payload = "example coinbase payload";
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("03000500010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000", "hex"));
    });

    test('Test bitcoin transaction builder [3]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.coinbasetxn = {};
        transactionData.coinbasetxn.data = "0400008085202";
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("04000080010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c42000000000", "hex"));
    });

    test('Test bitcoin transaction builder [4]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.masternode = {};
        transactionData.masternode.payee = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
        transactionData.masternode.payee_amount = 194005101;
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [5]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.masternode = []
        transactionData.masternode.push({ payee: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", amount: 194005101 });
        transactionData.masternode.push({ payee: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", amount: 194005102 });
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [6]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.masternode = []
        transactionData.masternode.push({ script: "0014e8df018c7e326cc253faac7e46cdc51e68542c42", amount: 194005101 });
        transactionData.masternode.push({ script: "0014e8df018c7e326cc253faac7e46cdc51e68542c42", amount: 194005102 });
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [7]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.superblock = []
        transactionData.superblock.push({ payee: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", amount: 194005101 });
        transactionData.superblock.push({ payee: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", amount: 194005102 });
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [8]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.superblock = []
        transactionData.superblock.push({ script: "0014e8df018c7e326cc253faac7e46cdc51e68542c42", amount: 194005101 });
        transactionData.superblock.push({ script: "0014e8df018c7e326cc253faac7e46cdc51e68542c42", amount: 194005102 });
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000040000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf92561e51201000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c426e48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [9]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.payee = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
        transactionData.payee_amount = 194005101;
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf993a9751e01000000160014e8df018c7e326cc253faac7e46cdc51e68542c426d48900b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [10]', () => {
        const optionData = JSON.parse(JSON.stringify(options));
        optionData.recipients.push({ address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", percentage: 0.05 })
        const transaction = transactions.bitcoin(rpcData, extraNonce, optionData);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9803f1f1b01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4280b2e60e00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [11]', () => {
        const optionData = JSON.parse(JSON.stringify(options));
        optionData.coin.txMessages = true;
        const transaction = transactions.bitcoin(rpcData, extraNonce, optionData);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c42000000002d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d736572766572", "hex"));
    });

    test('Test bitcoin transaction builder [12]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.coinbaseaux.flags = "test";
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [13]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.masternode = {};
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000020000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [13]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        transactionData.payee = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d73657276657200000000030000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf900286bee00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200ca9a3b00000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });

    test('Test bitcoin transaction builder [14]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        delete transactionData.default_witness_commitment;
        const transaction = transactions.bitcoin(transactionData, extraNonce, options);
        expect(transaction[0].slice(0, -5)).toStrictEqual(Buffer.from("01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3d5104", "hex"));
        expect(transaction[1]).toStrictEqual(Buffer.from("2d68747470733a2f2f6769746875622e636f6d2f626c696e6b686173682f626c696e6b686173682d736572766572000000000100f2052a01000000160014e8df018c7e326cc253faac7e46cdc51e68542c4200000000", "hex"));
    });
});
