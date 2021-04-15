/*
 *
 * Stratum (Updated)
 *
 */

const net = require('net');
const events = require('events');
const utils = require('./utils.js');

/**
 * Defining each client that connects to the stratum server.
 * Emits:
 *  - subscription(obj, cback(error, extraNonce1, extraNonce2Size))
 *  - submit(data(name, jobID, extraNonce2, ntime, nonce))
**/

// Main Stratum Client Function
const StratumClient = function(options) {

    const _this = this;
    this.authorized = false;
    this.banning = options.banning;
    this.difficulty = 0;
    this.lastActivity = Date.now();
    this.pendingDifficulty = null;
    this.remoteAddress = options.socket.remoteAddress;
    this.shares = { valid: 0, invalid: 0 };
    this.socket = options.socket;

    // Helper Function if Banning is Disabled
    this.banningDisabled = function() {
        return false;
    };

    // Helper Function if Banning is Enabled
    this.banningEnabled = function(shareValid) {
        if (shareValid === true) {
            _this.shares.valid += 1;
        }
        else {
            _this.shares.invalid += 1;
        }
        const totalShares = _this.shares.valid + _this.shares.invalid;
        if (totalShares >= _this.banning.checkThreshold) {
            const percentBad = (_this.shares.invalid / totalShares) * 100;
            if (percentBad < _this.banning.invalidPercent) {
                this.shares = { valid: 0, invalid: 0 };
            }
            else {
                _this.emit('triggerBan', _this.shares.invalid + ' out of the last ' + totalShares + ' shares were invalid');
                _this.socket.destroy();
                return true;
            }
        }
        return false;
    };

    this.considerBan = (!_this.banning || !_this.banning.enabled) ? _this.banningDisabled : _this.banningEnabled;

    // Manage JSON Functionality
    this.sendJson = function() {
        let response = '';
        Object.keys(arguments).forEach(arg => {
            response += JSON.stringify(arguments[arg]) + '\n';
        });
        options.socket.write(response);
    };

    // Establish Stratum Connection
    this.start = function() {

        // Setup Main Socket Connection
        let dataBuffer = '';
        const socket = options.socket;
        socket.setEncoding('utf8');
        if (options.tcpProxyProtocol === true) {
            socket.once('data', function (d) {
                if (d.indexOf('PROXY') === 0) {
                    _this.remoteAddress = d.split(' ')[2];
                }
                else {
                    _this.emit('tcpProxyError', d);
                }
                _this.emit('checkBan');
            });
        }
        else {
            _this.emit('checkBan');
        }

        socket.on('data', function(d) {
            dataBuffer += d;
            if (Buffer.byteLength(dataBuffer, 'utf8') > 10240) {
                dataBuffer = '';
                _this.emit('socketFlooded');
                socket.destroy();
                return;
            }
            if (dataBuffer.indexOf('\n') !== -1) {
                const messages = dataBuffer.split('\n');
                const incomplete = dataBuffer.slice(-1) === '\n' ? '' : messages.pop();
                messages.forEach(function(message) {
                    if (message === '') return;
                    let messageJson;
                    try {
                        messageJson = JSON.parse(message);
                    }
                    catch(e) {
                        if (options.tcpProxyProtocol !== true || d.indexOf('PROXY') !== 0) {
                            _this.emit('malformedMessage', message);
                            socket.destroy();
                        }
                        return;
                    }
                    if (messageJson) {
                        _this.handleMessage(messageJson);
                    }
                });
                dataBuffer = incomplete;
            }
        });

        socket.on('close', function() {
            _this.emit('socketDisconnect');
        });

        socket.on('error', function(e) {
            if (e.code !== 'ECONNRESET')
                _this.emit('socketError', e);
        });
    };

    // Handle Stratum Messages
    this.handleMessage = function(message) {
        switch (message.method) {
            case 'mining.subscribe':
                _this.handleSubscribe(message);
                break;
            case 'mining.authorize':
                _this.handleAuthorize(message, true);
                break;
            case 'mining.submit':
                _this.lastActivity = Date.now();
                _this.handleSubmit(message);
                break;
            case 'mining.get_transactions':
                _this.sendJson({
                    id: message.id,
                    result: [],
                    error: [20, "Not supported.", null]
                });
                break;
            case 'mining.extranonce.subscribe':
                _this.sendJson({
                    id: message.id,
                    result: false,
                    error: [20, "Not supported.", null]
                });
                break;
            default:
                _this.emit('unknownStratumMethod', message);
                break;
        }
    };

    // Manage Stratum Subscription
    this.handleSubscribe = function(message) {
        _this.emit('subscription', {}, function(error, extraNonce1, extraNonce2Size) {
            if (error) {
                _this.sendJson({ id: message.id, result: null, error: error });
                return;
            }
            _this.extraNonce1 = extraNonce1;
            _this.sendJson({
                id: message.id,
                result: [
                    [
                        ["mining.set_difficulty", options.subscriptionId],
                        ["mining.notify", options.subscriptionId]
                    ],
                    extraNonce1,
                    extraNonce2Size
                ],
                error: null
            });
        });
    };

    // Manage Stratum Authorization
    this.handleAuthorize = function(message, replyToSocket) {
        options.authorizeFn(_this.remoteAddress, options.socket.localPort, message.params[0], message.params[1], function(result) {
            _this.authorized = (!result.error && result.authorized);
            if (replyToSocket) {
                _this.sendJson({
                    id: message.id,
                    result: _this.authorized,
                    error: result.error
                });
            }
            if (result.disconnect === true) {
                options.socket.destroy();
            }
        });
    };

    // Manage Stratum Submission
    this.handleSubmit = function(message) {
        if (!_this.authorized) {
            _this.sendJson({
                id: message.id,
                result: null,
                error: [24, "unauthorized worker", null]
            });
            _this.considerBan(false);
            return;
        }
        if (!_this.extraNonce1) {
            _this.sendJson({
                id: message.id,
                result: null,
                error: [25, "not subscribed", null]
            });
            _this.considerBan(false);
            return;
        }
        _this.emit('submit', message, function(error, result) {
            if (!_this.considerBan(result)) {
                _this.sendJson({
                    id: message.id,
                    result: result,
                    error: error
                });
            }
        });
    };

    // Get Label of Stratum Client
    this.getLabel = function() {
        return (_this.workerName || '(unauthorized)') + ' [' + _this.remoteAddress + ']';
    };

    // Push Updated Difficulty to Difficulty Queue
    this.enqueueNextDifficulty = function(requestedNewDifficulty) {
        _this.pendingDifficulty = requestedNewDifficulty;
        return true;
    };

    // Broadcast Difficulty to Stratum Client
    this.sendDifficulty = function(difficulty) {
        if (difficulty === _this.difficulty) {
            return false;
        }
        _this.previousDifficulty = _this.difficulty;
        _this.difficulty = difficulty;
        _this.sendJson({
            id: null,
            method: "mining.set_difficulty",
            params: [difficulty],
        });
        return true;
    };

    // Broadcast Mining Job to Stratum Client
    this.sendMiningJob = function(jobParams) {
        const lastActivityAgo = Date.now() - _this.lastActivity;
        if (lastActivityAgo > options.connectionTimeout * 1000) {
            _this.emit('socketTimeout', 'last submitted a share was ' + (lastActivityAgo / 1000 | 0) + ' seconds ago');
            _this.socket.destroy();
            return;
        }
        if (_this.pendingDifficulty != null) {
            const result = _this.sendDifficulty(_this.pendingDifficulty);
            _this.pendingDifficulty = null;
            if (result) {
                _this.emit('difficultyChanged', _this.difficulty);
            }
        }
        _this.sendJson({
            id: null,
            method: "mining.notify",
            params: jobParams
        });
    };
};

/**
 * The actual stratum server.
 * It emits the following Events:
 *   - 'client.connected'(StratumClientInstance) - when a new miner connects
 *   - 'client.disconnected'(StratumClientInstance) - when a miner disconnects. Be aware that the socket cannot be used anymore.
 *   - 'started' - when the server is up and running
 **/

// Main Stratum Network Function
const StratumNetwork = function(options, authorizeFn) {

    const _this = this;
    this.stratumClients = {};
    this.stratumServers = {};
    this.bannedIPs = {};

    let rebroadcastTimeout;
    const subscriptionCounter = utils.subscriptionCounter();
    const bannedMS = options.banning ? options.banning.time * 1000 : null;

    // Start Stratum Capabilities
    this.start = function() {

        // Interval to Clear Old Bans from BannedIPs
        if (options.banning && options.banning.enabled) {
            setInterval(function() {
                Object.keys(_this.bannedIPs).forEach(ip => {
                    const banTime = _this.bannedIPs[ip];
                    if (Date.now() - banTime > options.banning.time) {
                        delete _this.bannedIPs[ip];
                    }
                });
            }, 1000 * options.banning.purgeInterval);
        }

        // Filter Individual Stratum Ports
        let stratumPorts = Object.keys(options.ports);
        stratumPorts = stratumPorts.filter(function(port) {
            return options.ports[port].enabled === true;
        });

        // Start Individual Stratum Servers
        let serversStarted = 0;
        stratumPorts.forEach(function(port) {
            const server = net.createServer({allowHalfOpen: false}, function(socket) {
                _this.handleNewClient(socket);
            });
            server.listen(parseInt(port), function() {
                serversStarted += 1;
                if (serversStarted == stratumPorts.length) {
                    _this.emit('started');
                }
            });
            _this.stratumServers[port] = server;
        });
    };

    // Stop Stratum Connection
    this.stopServer = function() {

        // Filter Individual Stratum Ports
        let stratumPorts = Object.keys(options.ports);
        stratumPorts = stratumPorts.filter(function(port) {
            return options.ports[port].enabled === true;
        });

        // Start Individual Stratum Servers
        stratumPorts.forEach(function(port) {
            const server = _this.stratumServers[port];
            server.close();
        });

        _this.emit('stopped');
    };

    // Check Regarding Banned Clients
    this.checkBan = function(client) {
        if (options.banning && options.banning.enabled && client.remoteAddress in _this.bannedIPs) {
            const bannedTime = _this.bannedIPs[client.remoteAddress];
            const bannedTimeAgo = Date.now() - bannedTime;
            const timeLeft = bannedMS - bannedTimeAgo;
            if (timeLeft > 0) {
                client.socket.destroy();
                client.emit('kickedBannedIP', timeLeft / 1000 | 0);
            }
            else {
                delete _this.bannedIPs[client.remoteAddress];
                client.emit('forgaveBannedIP');
            }
        }
    };

    // Manage New Client Connections
    this.handleNewClient = function (socket) {

        // Establish New Stratum Client
        socket.setKeepAlive(true);
        const subscriptionId = subscriptionCounter.next();
        const client = new StratumClient({
            subscriptionId: subscriptionId,
            authorizeFn: authorizeFn,
            socket: socket,
            banning: options.banning,
            connectionTimeout: options.connectionTimeout,
            tcpProxyProtocol: options.tcpProxyProtocol
        });
        _this.stratumClients[subscriptionId] = client;

        // Manage Client Behaviors
        _this.emit('client.connected', client);
        client.on('socketDisconnect', function() {
            delete _this.stratumClients[subscriptionId];
            _this.emit('client.disconnected', client);
        });
        client.on('checkBan', function() {
            _this.checkBan(client);
        });
        client.on('triggerBan', function() {
            _this.addBannedIP(client.remoteAddress);
            _this.emit('client.banned', client);
        });

        client.start();
        return subscriptionId;
    };

    // Broadcast New Jobs to Clients
    this.broadcastMiningJobs = function(jobParams) {
        Object.keys(_this.stratumClients).forEach(clientId => {
            const client = _this.stratumClients[clientId];
            client.sendMiningJob(jobParams);
        });
        clearTimeout(rebroadcastTimeout);
        rebroadcastTimeout = setTimeout(function() {
            _this.emit('broadcastTimeout');
        }, options.jobRebroadcastTimeout * 1000);
    };

    // Add Banned IP to List of Banned IPs
    this.addBannedIP = function(ipAddress) {
        _this.bannedIPs[ipAddress] = Date.now();
    };

    _this.start();
};

exports.network = StratumNetwork;
StratumClient.prototype.__proto__ = events.EventEmitter.prototype;
StratumNetwork.prototype.__proto__ = events.EventEmitter.prototype;
