/*
 *
 * Algorithms (Updated)
 *
 */

const Algorithms = require('../main/algorithms');

////////////////////////////////////////////////////////////////////////////////

describe('Test algorithm functionality', () => {

    // Deterministic
    test('Test implemented sha256d algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("dc83687981432eb309f7c96a51f8bd10cec4a4630f47fdca1c2768d34ba9031a", "hex");
        expect(Algorithms.sha256d.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.sha256d.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented scrypt algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("8438235b4ae8f5ad897f9482545fdca3ebeabbc15bffd544cd35d2419976cb8d", "hex");
        expect(Algorithms.scrypt.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.scrypt.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Non-Deterministic
    test('Test implemented c11 algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        expect(Algorithms.c11.hash({}).apply(null, [start]).length).toBe(32);
    });

    // Deterministic
    test('Test implemented x11 algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("61d8655d2aaaded233812baafe6d6472a818246ac641882eb1134af814306071", "hex");
        expect(Algorithms.x11.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.x11.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented x13 algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("bb638d59545d0be7d976862a1d90cc38149f32c83f46f4e6e0e01f70190dd168", "hex");
        expect(Algorithms.x13.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.x13.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented x15 algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("4c96c4733c3012eda472229214c71f63defa052e71ea3425d72d899822bc65df", "hex");
        expect(Algorithms.x15.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.x15.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented x16r algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("f3bd8f00ace441b322c14a179396c0835087536a2d86b7fec062ab88beb0e9c5", "hex");
        expect(Algorithms.x16r.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.x16r.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented x16rv2 algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("f3bd8f00ace441b322c14a179396c0835087536a2d86b7fec062ab88beb0e9c5", "hex");
        expect(Algorithms.x16rv2.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.x16rv2.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented nist5 algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("1bc1a908ccdc3ca21241162a733e792ef5f6ef705ed2c988863d16313fc12680", "hex");
        expect(Algorithms.nist5.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.nist5.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented quark algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("c7b2305e079030ce11a87ca15bf497d378ffc8c2a3739965f544ba53f5c3799e", "hex");
        expect(Algorithms.quark.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.quark.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented keccak algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output1 = Buffer.from("976ce35ca29d5e4ce95f794fe13545580434dce2a7409c98d0888e9eeacd833a", "hex");
        const output2 = Buffer.from("c15f86aa8074976250e7bb2b286850435ae1723b75ee28f3f8eaa3698eafb31e", "hex");
        expect(Algorithms.keccak.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.keccak.hash({}).apply(null, [start])).toStrictEqual(output1);
        expect(Algorithms.keccak.hash({ normalHashing: true}).apply(null, [start, ""])).toStrictEqual(output2);
    });

    // Deterministic
    test('Test implemented blake algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("333ee53bcaa24da99c4e4cad0f1cfb3411193abbd8323e8f4ea7231811cb7d55", "hex");
        expect(Algorithms.blake.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.blake.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Non-Deterministic
    test('Test implemented neoscrypt algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        expect(Algorithms.neoscrypt.hash({}).apply(null, [start, ""]).length).toBe(32);
    });

    // Deterministic
    test('Test implemented skein algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("33b951f9768163ad67e27b7cea6aa82a0153cf9055ddc0b419ccbdc33a32b12c", "hex");
        expect(Algorithms.skein.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.skein.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented groestl algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("c444502e5a9f93f221950a9d392987570aa3a8e8cb837749ec33eafa140cf017", "hex");
        expect(Algorithms.groestl.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.groestl.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented fugue algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("10b761d0a8e010f8dbfc320f59df415d0bfe52ff2c6179c655c77315f6f02dd4", "hex");
        expect(Algorithms.fugue.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.fugue.hash({}).apply(null, [start])).toStrictEqual(output);
    });

    // Deterministic
    test('Test implemented qubit algorithm', () => {
        const start = Buffer.from("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f");
        const output = Buffer.from("dcd2123c2a5750fab43f78f9a5834c5ef20acda10c0b9de3035b91a51a3408bb", "hex");
        expect(Algorithms.qubit.hash({}).apply(null, [start]).length).toBe(32);
        expect(Algorithms.qubit.hash({}).apply(null, [start])).toStrictEqual(output);
    });
});
