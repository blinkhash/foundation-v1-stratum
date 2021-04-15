/*
 *
 * Daemon (Updated)
 *
 */

// Import Required Modules
const nock = require('nock');

// Import Required Modules
const DaemonInterface = require('../main/daemon');

const daemons = [{
    "host": "127.0.0.1",
    "port": "8332",
    "user": "blinkhash",
    "password": "blinkhash"
}];

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');
const daemon = new DaemonInterface(daemons);

////////////////////////////////////////////////////////////////////////////////

describe('Test daemon functionality', () => {

    test('Test if logger is working properly', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        daemon.logger("debug", "Test Message");
        expect(typeof daemon.logger).toBe("function");
        expect(consoleSpy).toHaveBeenCalledWith('debug: Test Message');
        console.log.mockClear();
    });

    test('Test indexing of daemons', () => {
        const indexedDaemons = daemon.indexDaemons(daemons);
        expect(indexedDaemons[0].index).toBe(0);
    });

    test('Test initialization of daemons [1]', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                error: null,
                response: null,
                instance: "nocktest",
            }));
        daemon.initDaemons((response) => {
            expect(response).toBe(true);
            done();
        });
    });

    test('Test initialization of daemons [2]', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                error: true,
                response: null,
                instance: "nocktest",
            }));
        daemon.initDaemons((response) => {
            expect(response).toBe(false);
            done();
        });
    });

    test('Test online status of mock daemons [1]', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                error: null,
                response: null,
                instance: "nocktest",
            }));
        daemon.isOnline((response) => {
            expect(response).toBe(true);
            done();
        });
    });

    test('Test online status of mock daemons [2]', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getpeerinfo")
            .reply(200, JSON.stringify({
                error: true,
                response: null,
                instance: "nocktest",
            }));
        daemon.isOnline((response) => {
            expect(response).toBe(false);
            done();
        });
    });

    test('Test raw data handling of mock daemons', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getinfo")
            .reply(200, JSON.stringify({
                error: null,
                response: null,
                instance: "nocktest",
            }));
        daemon.cmd('getinfo', [], function(results) {
            const response = '{"error":null,"response":null,"instance":"nocktest"}';
            expect(results[0].data).toBe(response);
            done();
        }, false, true);
    });

    test('Test streaming data handling of mock daemons', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getinfo")
            .reply(200, JSON.stringify({
                error: null,
                response: null,
                instance: "nocktest",
            }));
        daemon.cmd('getinfo', [], function(results) {
            expect(results.error).toBe(null);
            done();
        }, true, false);
    });

    test('Test error handling of mock daemons [1]', (done) => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getinfo")
            .reply(401, {});
        daemon.cmd('getinfo', [], function() {
            expect(consoleSpy).toHaveBeenCalledWith('error: Unauthorized RPC access - invalid RPC username or password');
            console.log.mockClear();
            done();
        });
    });

    test('Test error handling of mock daemons [2]', (done) => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getinfo")
            .reply(200, 'this is an example of bad data {/13');
        const request = JSON.stringify({ "method": "getinfo", "params": [], "id": 1615071070849 });
        daemon.performHttpRequest(daemon.instances[0], request, function() {
            const output = 'error: Could not parse RPC data from daemon instance 0\nRequest Data: {"method":"getinfo","params":[],"id":1615071070849}\nReponse Data: this is an example of bad data {/13';
            expect(consoleSpy).toHaveBeenCalledWith(output);
            console.log.mockClear();
            done();
        });
    });

    test('Test error handling of mock daemons [3]', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getinfo")
            .replyWithError({ code: 'ECONNREFUSED' });
        daemon.cmd('getinfo', [], function(results) {
            expect(results[0].error.type).toBe('offline');
            done();
        });
    });

    test('Test error handling of mock daemons [4]', (done) => {
        nock('http://127.0.0.1:8332')
            .post('/', body => body.method === "getinfo")
            .replyWithError({ code: 'ALTERNATE' });
        daemon.cmd('getinfo', [], function(results) {
            expect(results[0].error.type).toBe('request error');
            done();
        });
    });

    test('Test handling of batch commands to mock daemons', (done) => {
        const commands = [['getinfo', []], ['getpeerinfo', []]];
        nock('http://127.0.0.1:8332')
            .post('/').reply(200, JSON.stringify([
                { id: "nocktest", error: null, result: null },
                { id: "nocktest", error: null, result: null },
            ]));
        daemon.batchCmd(commands, function(error, results) {
            expect(results.length).toBe(2);
            expect(results[0].id).toBe("nocktest");
            expect(results[0].error).toBe(null);
            expect(results[0].result).toBe(null);
            done();
        });
    });
});
