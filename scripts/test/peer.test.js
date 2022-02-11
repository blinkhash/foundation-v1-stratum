/*
 *
 * Peer (Updated)
 *
 */

const Peer = require('../main/peer');

const poolConfig = {
  'p2p': {
    'enabled': true,
    'host': '127.0.0.1',
    'port': '8332',
  },
  'settings': {
    'verack': false,
    'validConnectionConfig': true,
    'testnet': false,
  },
  'primary': {
    'coin': {
      'mainnet': {
        'peerMagic': 'f9beb4d9',
      },
      'testnet': {
        'peerMagic': '0b110907',
      },
    },
  },
};

////////////////////////////////////////////////////////////////////////////////

describe('Test peer functionality', () => {

  let configCopy, output1, output2;
  beforeEach(() => {
    configCopy = JSON.parse(JSON.stringify(poolConfig));
  });

  test('Test initialization of peer socket', () => {
    const peer = new Peer(configCopy);
    const client = peer.setupPeer();
    expect(typeof client).toBe('object');
    expect(Object.keys(client._events).length).toBe(5);
  });

  test('Test peer magic functionality', () => {
    configCopy.settings.testnet = true;
    const peer = new Peer(configCopy);
    expect(peer.magic).toEqual(Buffer.from(configCopy.primary.coin.testnet.peerMagic, 'hex'));
  });

  test('Test peer socket events [1]', () => {
    configCopy.settings.verack = true;
    const peer = new Peer(configCopy);
    peer.on('disconnected', () => output1 = 'Disconnected');
    const client = peer.setupPeer();
    client.emit('close');
    expect(output1).toBe('Disconnected');
  });

  test('Test peer socket events [2]', () => {
    configCopy.settings.validConnectionConfig = true;
    const peer = new Peer(configCopy);
    peer.on('connectionRejected', () => output1 = 'Connection Rejected');
    const client = peer.setupPeer();
    client.emit('close');
    expect(output1).toBe('Connection Rejected');
  });

  test('Test peer socket events [3]', () => {
    const peer = new Peer(configCopy);
    peer.on('connectionFailed', () => output1 = 'Connection Failed');
    const client = peer.setupPeer();
    client.emit('error', { code: 'ECONNREFUSED' });
    expect(output1).toBe('Connection Failed');
  });

  test('Test peer socket events [4]', () => {
    const peer = new Peer(configCopy);
    peer.on('socketError', () => output1 = 'Socket Error');
    const client = peer.setupPeer();
    client.emit('error', {});
    expect(output1).toBe('Socket Error');
  });

  test('Test peer socket inventory', () => {
    const peer = new Peer(configCopy);
    peer.on('blockFound', () => output1 = 'Block Found');
    peer.handleInventory(Buffer.from('0100000000', 'hex'));
    peer.handleInventory(Buffer.from('0101000000', 'hex'));
    peer.handleInventory(Buffer.from('0102000000', 'hex'));
    expect(output1).toBe('Block Found');
  });

  test('Test peer socket messaging [1]', () => {
    const peer = new Peer(configCopy);
    const inv = Buffer.from('696e76000000000000000000', 'hex');
    const payload = Buffer.from('0102000000', 'hex');
    peer.on('peerMessage', (message) => output1 = message);
    peer.on('blockFound', () => output2 = 'Block Found');
    peer.handleMessage(inv.toString(), payload);
    expect(output1.command).toStrictEqual(inv.toString());
    expect(output1.payload).toStrictEqual(payload);
    expect(output2).toBe('Block Found');
  });

  test('Test peer socket messaging [2]', () => {
    configCopy.settings.verack = false;
    const peer = new Peer(configCopy);
    const verack = Buffer.from('76657261636b000000000000', 'hex');
    const payload = Buffer.from('0100000000', 'hex');
    peer.on('peerMessage', (message) => output1 = message);
    peer.on('connected', () => output2 = 'Connected');
    peer.handleMessage(verack.toString(), payload);
    expect(output1.command).toStrictEqual(verack.toString());
    expect(output1.payload).toStrictEqual(payload);
    expect(output2).toBe('Connected');
  });

  test('Test peer socket messaging [3]', () => {
    const peer = new Peer(configCopy);
    const version = Buffer.from('76657273696f6e0000000000', 'hex');
    const payload = Buffer.from('0100000000', 'hex');
    peer.on('peerMessage', (message) => output1 = message);
    peer.on('sentMessage', (message) => output2 = message);
    peer.handleMessage(version.toString(), payload);
    expect(output1.command).toStrictEqual(version.toString());
    expect(output1.payload).toStrictEqual(payload);
    expect(output2).toStrictEqual(Buffer.from('f9beb4d976657261636b000000000000000000005df6e0e2', 'hex'));
  });

  test('Test peer socket messaging [4]', () => {
    const peer = new Peer(configCopy);
    const other = Buffer.from('00', 'hex');
    const payload = Buffer.from('0100000000', 'hex');
    peer.on('peerMessage', (message) => output1 = message);
    peer.handleMessage(other.toString(), payload);
    expect(output1.command).toStrictEqual(other.toString());
    expect(output1.payload).toStrictEqual(payload);
  });

  test('Test peer version messaging', () => {
    const peer = new Peer(configCopy);
    peer.on('sentMessage', (message) => output1 = message);
    peer.sendVersion();
    expect(output1.slice(0, 20)).toStrictEqual(Buffer.from('f9beb4d976657273696f6e000000000064000000', 'hex'));
    expect(output1.slice(24, 36)).toStrictEqual(Buffer.from('000000000100000000000000', 'hex'));
    expect(output1.slice(40, 96)).toStrictEqual(Buffer.from('00000000010000000000000000000000000000000000ffff000000000000010000000000000000000000000000000000ffff000000000000', 'hex'));
    expect(output1.slice(104)).toStrictEqual(Buffer.from('0e2f6e6f64652d7374726174756d2f0000000000', 'hex'));
  });
});
