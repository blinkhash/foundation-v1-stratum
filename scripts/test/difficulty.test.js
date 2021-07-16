/*
 *
 * Difficulty (Updated)
 *
 */

const events = require('events');
const Difficulty = require('../main/difficulty');

// Bad Settings
const port = 3001;
const vardiff1 = {
  'minimum': 8,
  'maximum': 8,
  'targetTime': 1,
  'retargetTime': 1,
  'variance': -0.001,
};
const vardiff2 = {
  'minimum': 8,
  'maximum': 8,
  'targetTime': 1,
  'retargetTime': 1,
  'variance': -0.001,
  'x2mode': true,
};

////////////////////////////////////////////////////////////////////////////////

describe('Test difficulty functionality', () => {

  let client;
  beforeEach(() => {
    client = new events.EventEmitter();
    client.lastActivity = Date.now();
    client.difficulty = 8;
    client.socket = { localPort: port };
  });

  let difficulty1, difficulty2;
  beforeEach(() => {
    difficulty1 = new Difficulty(port, vardiff1, false);
    difficulty2 = new Difficulty(port, vardiff2, true);
  });

  test('Test difficulty error handling', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    client.socket.localPort = 3002;
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    expect(consoleSpy).toHaveBeenCalledWith('Handling a client which is not of this vardiff?');
    console.error.mockClear();
  });

  test('Test client difficulty management [1]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    expect(consoleSpy).toHaveBeenCalledWith('Setting difficulty on client initialization');
    console.log.mockClear();
  });

  test('Test client difficulty management [2]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    client.emit('submit');
    expect(consoleSpy).toHaveBeenCalledWith('No difficulty update required');
    console.log.mockClear();
  });

  test('Test client difficulty management [3]', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    for (let step = 0; step < 5; step += 1) {
      client.emit('submit');
      expect(consoleSpy).toHaveBeenCalledWith('No difficulty update required');
      console.log.mockClear();
    }
  });

  test('Test client difficulty management [4]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    setTimeout(() => {
      client.emit('submit');
      expect(consoleSpy).toHaveBeenCalledWith('No difficulty update required');
      console.log.mockClear();
      done();
    }, 2000);
  });

  test('Test client difficulty management [5]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    client.difficulty = 6;
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    setTimeout(() => {
      client.emit('submit');
      expect(consoleSpy).toHaveBeenCalledWith('Increasing current difficulty');
      console.log.mockClear();
      done();
    }, 1000);
  });

  test('Test client difficulty management [6]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    client.difficulty = 10;
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    setTimeout(() => {
      client.emit('submit');
      expect(consoleSpy).toHaveBeenCalledWith('Decreasing current difficulty');
      console.log.mockClear();
      done();
    }, 2000);
  });

  test('Test client difficulty management [7]', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    client.difficulty = 16;
    difficulty1.manageClient(client);
    difficulty2.manageClient(client);
    client.emit('submit');
    setTimeout(() => {
      client.emit('submit');
      expect(consoleSpy).toHaveBeenCalledWith('Decreasing current difficulty');
      console.log.mockClear();
      done();
    }, 2000);
  });
});
