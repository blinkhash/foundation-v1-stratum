/*
 *
 * Merkle (Updated)
 *
 */

// Import Required Modules
const utils = require('../main/utils');

// Import Required Modules
const Merkle = require('../main/merkle');

const data1 = [
    null,
    Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
];

const data2 = [
    null,
    Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
    Buffer.from('27a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
    Buffer.from('37a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
    Buffer.from('47a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
    Buffer.from('57a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
    Buffer.from('67a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'),
];

const merkle1 = new Merkle();
const merkle2 = new Merkle([ null ]);
const merkle3 = new Merkle(data1);
const merkle4 = new Merkle(data2);

////////////////////////////////////////////////////////////////////////////////

describe('Test merkle functionality', () => {

    test('Test step length calculations', () => {
        expect(merkle1.steps.length).toBe(0);
        expect(merkle2.steps.length).toBe(0);
        expect(merkle3.steps.length).toBe(1);
        expect(merkle4.steps.length).toBe(3);
    });

    test('Test step hash calculations', () => {
        expect(merkle3.steps[0]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
        expect(merkle4.steps[0]).toStrictEqual(Buffer.from('17a35a38e70cd01488e0d5ece6ded04a9bc8125865471d36b9d5c47a08a5907c', 'hex'));
        expect(merkle4.steps[1]).toStrictEqual(Buffer.from('a746a25262781a33d723026d2ca22146735dd20cd6318dae5c73381d17f6eb37', 'hex'));
        expect(merkle4.steps[2]).toStrictEqual(Buffer.from('5892e5d4493413b3fb2e3297f67169b3522a972f3b06a68df13ecdb9aac1ab6f', 'hex'));
    });

    test('Test withFirst calculations', () => {
        const coinbaseHash = Buffer.from("afd031100bff85a9ac01f1718be0b3d6c20228592f0242ea1e4d91a519b53031", "hex");
        const merkleRoot = utils.reverseBuffer(merkle3.withFirst(coinbaseHash)).toString('hex');
        expect(merkleRoot).toBe("0b8dcdd18969a859444b18f927f69202f5a8c4379b3ed5b3f7c1bd1f57e916d0");
    });
});
