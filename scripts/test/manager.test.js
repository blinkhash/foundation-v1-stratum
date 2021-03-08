/*
 *
 * Manager (Updated)
 *
 */

// Import Required Modules
const Manager = require('../main/manager');

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
    "rewards": {
        "rewardType": ""
    }
}

////////////////////////////////////////////////////////////////////////////////

describe('Test manager functionality', () => {

    let manager;
    beforeEach(() => {
        manager = new Manager(options);
    });

    test('Test initial manager calculations', () => {
        expect(manager.jobCounter.cur()).toBe("0");
        expect(manager.jobCounter.next()).toBe("1");
        expect(manager.extraNonceCounter.size).toBe(4);
        expect(manager.extraNonceCounter.next().length).toBe(8);
        expect(manager.extraNoncePlaceholder).toStrictEqual(Buffer.from("f000000ff111111f", "hex"));
        expect(manager.extraNonce2Size).toBe(4);
    });

    test('Test jobCounter looping when counter overflows', () => {
        manager.jobCounter.counter = 65534;
        expect(manager.jobCounter.next()).toBe("1");
    });

    test('Test job updates given new blockTemplate', () => {
        manager.updateCurrentJob(rpcData);
        expect(typeof manager.currentJob).toBe("object")
        expect(manager.currentJob.rpcData.height).toBe(1)
        expect(manager.currentJob.rpcData.previousblockhash).toBe("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2")
        expect(typeof manager.validJobs[1]).toBe("object")
    });

    test('Test template updates given new blockTemplate [1]', () => {
        const response1 = manager.processTemplate(rpcData);
        const response2 = manager.processTemplate(rpcData);
        expect(response1).toBe(true)
        expect(response2).toBe(false)
    });

    test('Test template updates given new blockTemplate [2]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        const response1 = manager.processTemplate(transactionData);
        transactionData.previousblockhash = "8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2";
        const response2 = manager.processTemplate(transactionData);
        expect(response1).toBe(true)
        expect(response2).toBe(true)
    });

    test('Test template updates given new blockTemplate [2]', () => {
        const transactionData = JSON.parse(JSON.stringify(rpcData));
        const response1 = manager.processTemplate(transactionData);
        transactionData.previousblockhash = "8719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2";
        transactionData.height = 0;
        const response2 = manager.processTemplate(transactionData);
        expect(response1).toBe(true)
        expect(response2).toBe(false)
    });
});
