/*
 *
 * Util (Updated)
 *
 */

// Import Required Modules
const util = require('../main/util');

const network1 = {
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
};

const network2 = {
    "messagePrefix": "\x18Bitcoin Signed Message:\n",
    "bip32": {
        "public": 0x0488b21e,
        "private": 0x0488ade4,
    },
    "pubKeyHash": 0x00,
    "scriptHash": 0x05,
    "wif": 0x80,
    "coin": "bch",
    "forkId": 0x00
};

////////////////////////////////////////////////////////////////////////////////

describe('Test utility functionality', () => {

    test('Test implemented addressToScript [1]', () => {
        const script1 = util.addressToScript("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", network1);
        const script2 = util.addressToScript("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", network1);
        const script3 = util.addressToScript("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", network1);
        const script4 = util.addressToScript("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2");
        expect(script1).toStrictEqual(Buffer.from("76a91477bff20c60e522dfaa3350c39b030a5d004e839a88ac", "hex"));
        expect(script2).toStrictEqual(Buffer.from("a914b472a266d0bd89c13706a4132ccfb16f7c3b9fcb87", "hex"));
        expect(script3).toStrictEqual(Buffer.from("0014e8df018c7e326cc253faac7e46cdc51e68542c42", "hex"));
        expect(script4).toStrictEqual(Buffer.from("76a91477bff20c60e522dfaa3350c39b030a5d004e839a88ac", "hex"));
    });

    test('Test implemented addressToScript [2]', () => {
        const script1 = util.addressToScript("35qL43qYwLdKtnR7yMfGNDvzv6WyZ8yT2n", network2);
        const script2 = util.addressToScript("bitcoincash:pqkh9ahfj069qv8l6eysyufazpe4fdjq3u4hna323j", network2);
        expect(script1).toStrictEqual(Buffer.from("a9142d72f6e993f45030ffd64902713d107354b6408f87", "hex"));
        expect(script2).toStrictEqual(Buffer.from("a9142d72f6e993f45030ffd64902713d107354b6408f87", "hex"));
    });

    test('Test implemented bignumFromBitsBuffer', () => {
        expect(util.bignumFromBitsBuffer(Buffer.from("1e0ffff0", 'hex')).toNumber().toFixed(9)).toBe("1.1042625655198232e+71");
    });

    test('Test implemented bignumFromBitsHex', () => {
        expect(util.bignumFromBitsHex("1e0ffff0").toNumber().toFixed(9)).toBe("1.1042625655198232e+71");
    });

    test('Test implemented packUInt16LE', () => {
        expect(util.packUInt16LE(21243)).toStrictEqual(Buffer.from("fb52", "hex"));
        expect(util.packUInt16LE(13815)).toStrictEqual(Buffer.from("f735", "hex"));
    });

    test('Test implemented packUInt16BE', () => {
        expect(util.packUInt16BE(21243)).toStrictEqual(Buffer.from("52fb", "hex"));
        expect(util.packUInt16BE(13815)).toStrictEqual(Buffer.from("35f7", "hex"));
    });

    test('Test implemented packUInt32LE', () => {
        expect(util.packUInt32LE(21243)).toStrictEqual(Buffer.from("fb520000", "hex"));
        expect(util.packUInt32LE(13815)).toStrictEqual(Buffer.from("f7350000", "hex"));
    });

    test('Test implemented packUInt32BE', () => {
        expect(util.packUInt32BE(21243)).toStrictEqual(Buffer.from("000052fb", "hex"));
        expect(util.packUInt32BE(13815)).toStrictEqual(Buffer.from("000035f7", "hex"));
    });

    test('Test implemented packUInt64LE', () => {
        expect(util.packUInt64LE(134318333134318333)).toStrictEqual(Buffer.from("002b4bf5cf31dd01", "hex"));
        expect(util.packUInt64LE(783175331783175331)).toStrictEqual(Buffer.from("80ecc897d065de0a", "hex"));
        expect(util.packUInt64LE(581395135581395135)).toStrictEqual(Buffer.from("801878a2cb871108", "hex"));
        expect(util.packUInt64LE(317531313317531313)).toStrictEqual(Buffer.from("c0ce5a0f0c196804", "hex"));
    });

    test('Test implemented packUInt64LE', () => {
        expect(util.packUInt64BE(134318333134318333)).toStrictEqual(Buffer.from("01dd31cff54b2b00", "hex"));
        expect(util.packUInt64BE(783175331783175331)).toStrictEqual(Buffer.from("0ade65d097c8ec80", "hex"));
        expect(util.packUInt64BE(581395135581395135)).toStrictEqual(Buffer.from("081187cba2781880", "hex"));
        expect(util.packUInt64BE(317531313317531313)).toStrictEqual(Buffer.from("0468190c0f5acec0", "hex"));
    });

    test('Test implemented packInt32LE', () => {
        expect(util.packInt32LE(21243)).toStrictEqual(Buffer.from("fb520000", "hex"));
        expect(util.packInt32LE(13815)).toStrictEqual(Buffer.from("f7350000", "hex"));
    });

    test('Test implemented packInt32BE', () => {
        expect(util.packInt32BE(21243)).toStrictEqual(Buffer.from("000052fb", "hex"));
        expect(util.packInt32BE(13815)).toStrictEqual(Buffer.from("000035f7", "hex"));
    });

    test('Test implemented range', () => {
        expect(util.range(0, 10, 1)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(util.range(10)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(util.range(0, 5)).toStrictEqual([0, 1, 2, 3, 4]);
        expect(util.range(3, 15, 3)).toStrictEqual([3, 6, 9, 12]);
    });

    test('Test implemented reverseBuffer', () => {
        const buffer = util.reverseBuffer(Buffer.from("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2", "hex"))
        expect(buffer).toStrictEqual(Buffer.from("e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997", "hex"));
    });

    test('Test implemented reverseByteOrder', () => {
        const buffer = util.reverseByteOrder(Buffer.from("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2", "hex"))
        expect(buffer).toStrictEqual(Buffer.from("bc7727e2ee0395305fc6e36b29a60b37be7d49b6bd4c808b83ef65839719aefb", "hex"));
    });

    test('Test implemented reverseHex', () => {
        const buffer = util.reverseHex("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2", "hex")
        expect(buffer).toStrictEqual("e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997");
    });

    test('Test implemented serializeNumber', () => {
        expect(util.serializeNumber(16)).toStrictEqual(Buffer.from("60", "hex"));
        expect(util.serializeNumber(53)).toStrictEqual(Buffer.from("0135", "hex"));
    });

    test('Test implemented serializeString', () => {
        expect(util.serializeString("test")).toStrictEqual(Buffer.from("0474657374", "hex"));
        expect(util.serializeString("testtest")).toStrictEqual(Buffer.from("087465737474657374", "hex"));
    });

    test('Test implemented sha256', () => {
        const buffer = Buffer.from("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2", "hex");
        expect(util.sha256(buffer)).toStrictEqual(Buffer.from("e7f3a916fd573c459e0aedb2429ba7fa6c46eee2adc3769d6ed043c87798e8e7", "hex"));
    });

    test('Test implemented sha256d', () => {
        const buffer = Buffer.from("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2", "hex");
        expect(util.sha256d(buffer)).toStrictEqual(Buffer.from("0822da4833efcf7ea1d780c670eb47e255ed60ce42ab609eadb39f02effb580d", "hex"));
    });

    test('Test implemented uint256BufferFromHash', () => {
        const buffer = Buffer.from("9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2", "hex");
        expect(util.uint256BufferFromHash(buffer)).toStrictEqual(Buffer.from("e22777bc309503ee6be3c65f370ba629b6497dbe8b804cbd8365ef83fbae1997", "hex"));
    });

    test('Test implemented varIntBuffer', () => {
        expect(util.varIntBuffer(100)).toStrictEqual(Buffer.from("64", "hex"));
        expect(util.varIntBuffer(1000)).toStrictEqual(Buffer.from("fde803", "hex"));
        expect(util.varIntBuffer(10000)).toStrictEqual(Buffer.from("fd1027", "hex"));
        expect(util.varIntBuffer(100000)).toStrictEqual(Buffer.from("fea0860100", "hex"));
        expect(util.varIntBuffer(10000000000)).toStrictEqual(Buffer.from("ff00e40b5402000000", "hex"));
    });

    test('Test implemented varStringBuffer', () => {
        expect(util.varStringBuffer("testtesttest")).toStrictEqual(Buffer.from("0c746573747465737474657374", "hex"));
    });
});
