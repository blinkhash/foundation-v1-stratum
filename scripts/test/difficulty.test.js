/*
 *
 * Difficulty (Updated)
 *
 */

// Import Required Modules
let events = require('events');

// Import Required Modules
const Difficulty = require('../main/difficulty');

// Bad Settings
const portLog = 3001;
const vardiffLog = {
    "minDiff": 8,
    "maxDiff": 8,
    "targetTime": 1,
    "retargetTime": 1,
    "variancePercent": -0.1,
    "x2mode": true,
}

const difficultyLog = new Difficulty(portLog, vardiffLog, true);

const port = 3001;
const vardiff = {
    "minDiff": 8,
    "maxDiff": 512,
    "targetTime": 15,
    "retargetTime": 90,
    "variancePercent": 0.3,
}

const difficulty = new Difficulty(port, vardiff, false);

////////////////////////////////////////////////////////////////////////////////

describe('Test difficulty functionality (logging)', () => {

    let client;
    beforeEach(() => {
        client = new events.EventEmitter();
        client.lastActivity = Date.now();
        client.difficulty = 8;
        client.socket = { localPort: port }
        client.on('newDifficulty', function(client, newDiff) {
            console.log(client);
            console.log(newDiff);
        })
    })

    test('Test difficulty error handling', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        client.socket.localPort = 3002;
        difficultyLog.manageClient(client);
        expect(consoleSpy).toHaveBeenCalledWith('Handling a client which is not of this vardiff?');
        console.error.mockClear();
    });

    test('Test client difficulty management [1]', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        difficultyLog.manageClient(client);
        client.emit('submit');
        expect(consoleSpy).toHaveBeenCalledWith('Setting difficulty on client initialization');
        console.log.mockClear();
    });

    test('Test client difficulty management [2]', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        difficultyLog.manageClient(client);
        client.emit('submit');
        client.emit('submit');
        expect(consoleSpy).toHaveBeenCalledWith('No difficulty update required');
        console.log.mockClear();
    });

    test('Test client difficulty management [3]', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        difficultyLog.manageClient(client);
        client.emit('submit');
        for (let step = 0; step < 5; step++) {
            client.emit('submit');
            expect(consoleSpy).toHaveBeenCalledWith('No difficulty update required');
            console.log.mockClear();
        }
    });

    test('Test client difficulty management [4]', (done) => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        difficultyLog.manageClient(client);
        client.emit('submit');
        setTimeout(function() {
            client.emit('submit');
            expect(consoleSpy).toHaveBeenCalledWith('No difficulty update required');
            console.log.mockClear();
            done();
        }, 2000);
    });

    test('Test client difficulty management [5]', (done) => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        difficultyLog.manageClient(client);
        client.emit('submit');
        setTimeout(function() {
            client.emit('submit');
            expect(consoleSpy).toHaveBeenCalledWith('Decreasing current difficulty');
            console.log.mockClear();
            done();
        }, 1000);
    });

    test('Test client difficulty management [6]', (done) => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        client.difficulty = 10;
        difficultyLog.manageClient(client);
        client.emit('submit');
        setTimeout(function() {
            client.emit('submit');
            expect(consoleSpy).toHaveBeenCalledWith('Increasing current difficulty');
            console.log.mockClear();
            done();
        }, 2000);
    });
});

describe('Test difficulty functionality (normal)', () => {

});
