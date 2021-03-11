/*
 *
 * Peer (Updated)
 *
 */

// Import Required Modules
const mitm = require('mitm');

// Import Required Modules
const Peer = require('../main/peer');

const options = {
    "coin": {
        "peerMagic": "f9beb4d9",
        "peerMagicTestnet": "0b110907",
    },
    "p2p": {
        "enabled": true,
        "host": "127.0.0.1",
        "port": "8332",
        "disableTransactions": true
    },
    "testnet": false,
}

////////////////////////////////////////////////////////////////////////////////

describe('Test peer functionality', () => {

    let socket, output1, output2;
    beforeEach(() => socket = mitm());
    afterEach(() => socket.disable());

    test('Test initialization of peer socket', () => {
        const peer = new Peer(options);
        client = peer.initializePeer();
        expect(typeof client).toBe("object");
        expect(Object.keys(client._events).length).toBe(5);
    });

    test('Test peer socket events [1]', () => {
        const optionsData = Object.assign({}, options);
        optionsData.verack = true;
        const peer = new Peer(optionsData);
        peer.on('disconnected', () => output1 = "Disconnected");
        client = peer.initializePeer();
        client.emit('close');
        expect(output1).toBe('Disconnected');
    });

    test('Test peer socket events [2]', () => {
        const optionsData = Object.assign({}, options);
        optionsData.validConnectionConfig = true;
        const peer = new Peer(optionsData);
        peer.on('connectionRejected', () => output1 = "Connection Rejected");
        client = peer.initializePeer();
        client.emit('close');
        expect(output1).toBe('Connection Rejected');
    });

    test('Test peer socket events [3]', () => {
        const peer = new Peer(options);
        peer.on('connectionFailed', () => output1 = "Connection Failed");
        client = peer.initializePeer();
        client.emit('error', { code: "ECONNREFUSED" });
        expect(output1).toBe('Connection Failed');
    });

    test('Test peer socket events [4]', () => {
        const peer = new Peer(options);
        peer.on('socketError', () => output1 = "Socket Error");
        client = peer.initializePeer();
        client.emit('error', {});
        expect(output1).toBe('Socket Error');
    });

    test('Test peer socket inventory', () => {
        const peer = new Peer(options);
        peer.on('blockFound', () => output1 = "Block Found");
        peer.handleInventory(Buffer.from("0100000000", "hex"))
        peer.handleInventory(Buffer.from("0101000000", "hex"))
        peer.handleInventory(Buffer.from("0102000000", "hex"))
        expect(output1).toBe('Block Found');
    });

    test('Test peer socket messaging [1]', () => {
        const peer = new Peer(options);
        const inv = Buffer.from("696e76000000000000000000", "hex");
        const payload = Buffer.from("0102000000", "hex");
        peer.on('peerMessage', (message) => output1 = message);
        peer.on('blockFound', () => output2 = "Block Found");
        peer.handleMessage(inv.toString(), payload);
        expect(output1.command).toStrictEqual(inv.toString());
        expect(output1.payload).toStrictEqual(payload);
        expect(output2).toBe('Block Found');
    });

    test('Test peer socket messaging [2]', () => {
        const optionsData = Object.assign({}, options);
        optionsData.verack = false;
        const peer = new Peer(optionsData);
        const verack = Buffer.from("76657261636b000000000000", "hex");
        const payload = Buffer.from("0100000000", "hex");
        peer.on('peerMessage', (message) => output1 = message);
        peer.on('connected', () => output2 = "Connected");
        peer.handleMessage(verack.toString(), payload);
        expect(output1.command).toStrictEqual(verack.toString());
        expect(output1.payload).toStrictEqual(payload);
        expect(output2).toBe('Connected');
    });

    test('Test peer socket messaging [3]', () => {
        const peer = new Peer(options);
        const version = Buffer.from("76657273696f6e0000000000", "hex");
        const payload = Buffer.from("0100000000", "hex");
        peer.on('peerMessage', (message) => output1 = message);
        peer.on('sentMessage', (message) => output2 = message);
        peer.handleMessage(version.toString(), payload);
        expect(output1.command).toStrictEqual(version.toString());
        expect(output1.payload).toStrictEqual(payload);
        expect(output2).toStrictEqual(Buffer.from("f9beb4d976657261636b000000000000000000005df6e0e2", "hex"));
    });

    test('Test peer socket messaging [4]', () => {
        const peer = new Peer(options);
        const other = Buffer.from("00", "hex");
        const payload = Buffer.from("0100000000", "hex");
        peer.on('peerMessage', (message) => output1 = message);
        peer.handleMessage(other.toString(), payload);
        expect(output1.command).toStrictEqual(other.toString());
        expect(output1.payload).toStrictEqual(payload);
    });

    test('Test peer version messaging [4]', () => {
        const peer = new Peer(options);
        const version = Buffer.from("76657273696f6e0000000000", "hex");
        const payload = Buffer.from("0100000000", "hex");
        peer.on('sentMessage', (message) => output1 = message);
        peer.sendVersion();
        expect(output1.slice(0, 20)).toStrictEqual(Buffer.from("f9beb4d976657273696f6e000000000064000000", "hex"));
        expect(output1.slice(24, 36)).toStrictEqual(Buffer.from("000000000100000000000000", "hex"));
        expect(output1.slice(39, 96)).toStrictEqual(Buffer.from("6000000000010000000000000000000000000000000000ffff000000000000010000000000000000000000000000000000ffff000000000000", "hex"));
        expect(output1.slice(104)).toStrictEqual(Buffer.from("0e2f6e6f64652d7374726174756d2f0000000000", "hex"));
    });
});
