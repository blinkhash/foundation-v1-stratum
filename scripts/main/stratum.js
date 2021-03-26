/*
 *
 * Stratum (Updated)
 *
 */

// Import Required Modules
let net = require('net');
const events = require('events');
let util = require('./util.js');

// Increment Count for Each Subscription
let SubscriptionCounter = function() {
    let count = 0;
    let padding = 'deadbeefcafebabe';
    return {
        next: function() {
            count += 1;
            if (Number.MAX_VALUE === count) count = 0;
            return padding + util.packUInt64LE(count).toString('hex');
        }
    };
};

/**
 * Defining each client that connects to the stratum server.
 * Emits:
 *  - subscription(obj, cback(error, extraNonce1, extraNonce2Size))
 *  - submit(data(name, jobID, extraNonce2, ntime, nonce))
**/

// Stratum Client Main Function
let StratumClient = function(options) {

    // Establish Private Stratum Variables
    let _this = this;
    let algorithm = options.algorithm
    let banning = options.banning;
    let pendingDifficulty = null;

    // Establish Public Stratum Variables
    this.lastActivity = Date.now();
    this.socket = options.socket;
    this.remoteAddress = options.socket.remoteAddress;
    this.shares = {valid: 0, invalid: 0};

    // Helper Function if Banning is Disabled
    function banningDisabled() {
        return false;
    }

    // Helper Function if Banning is Enabled
    function banningEnabled(shareValid) {
        if (shareValid === true) {
            _this.shares.valid += 1;
        }
        else {
            _this.shares.invalid += 1;
        }
        let totalShares = _this.shares.valid + _this.shares.invalid;
        if (totalShares >= banning.checkThreshold) {
            let percentBad = (_this.shares.invalid / totalShares) * 100;
            if (percentBad < banning.invalidPercent) {
                this.shares = {valid: 0, invalid: 0};
            }
            else {
                _this.emit('triggerBan', _this.shares.invalid + ' out of the last ' + totalShares + ' shares were invalid');
                _this.socket.destroy();
                return true;
            }
        }
        return false;
    }

    // Determine Whether to Consider Banning
    let considerBan = (!banning || !banning.enabled) ? banningDisabled : banningEnabled;

    // Initialize Stratum Connection
    function initializeClient() {
        setupSocket();
    }

    // Establish Stratum Connection
    function setupSocket() {

        // Setup Main Socket Connection
        let dataBuffer = '';
        let socket = options.socket;
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

        // Manage Stratum Data Functionality
        socket.on('data', function(d) {
            dataBuffer += d;
            if (Buffer.byteLength(dataBuffer, 'utf8') > 10240) {
                dataBuffer = '';
                _this.emit('socketFlooded');
                socket.destroy();
                return;
            }
            if (dataBuffer.indexOf('\n') !== -1) {
                let messages = dataBuffer.split('\n');
                let incomplete = dataBuffer.slice(-1) === '\n' ? '' : messages.pop();
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
                        handleMessage(messageJson);
                    }
                });
                dataBuffer = incomplete;
            }
        });

        // Manage Stratum Close Functionality
        socket.on('close', function() {
            _this.emit('socketDisconnect');
        });

        // Manage Stratum Error Functionality
        socket.on('error', function(e) {
            if (e.code !== 'ECONNRESET')
                _this.emit('socketError', err);
        });
    }

    // Handle Stratum Messages
    function handleMessage(message) {
        switch (message.method) {

            // Manage Stratum Subscription
            case 'mining.subscribe':
                handleSubscribe(message);
                break;

            // Manage Stratum Authorization
            case 'mining.authorize':
                handleAuthorize(message, true);
                break;

            // Manage Stratum Submission
            case 'mining.submit':
                _this.lastActivity = Date.now();
                handleSubmit(message);
                break;

            // Manage Transactions
            case 'mining.get_transactions':
                sendJson({
                    id: null,
                    result: [],
                    error: true
                });
                break;

            // Manage Extranonce Capabilities
            case 'mining.extranonce.subscribe':
                sendJson({
                    id: message.id,
                    result: false,
                    error: [20, "Not supported.", null]
                });
                break;

            // Unknown Stratum Method
            default:
                _this.emit('unknownStratumMethod', message);
                break;
        }
    }

    // Manage Stratum Subscription
    function handleSubscribe(message) {
        if (! _this._authorized) {
            _this.requestedSubscriptionBeforeAuth = true;
        }
        _this.emit('subscription', {}, function(error, extraNonce1, extraNonce2Size) {
            if (error) {
                sendJson({ id: message.id, result: null, error: error });
                return;
            }
            _this.extraNonce1 = extraNonce1;
            sendJson({
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
    }

    // Manage Stratum Authorization
    function handleAuthorize(message, replyToSocket) {
        _this.workerName = message.params[0];
        _this.workerPass = message.params[1];
        options.authorizeFn(_this.remoteAddress, options.socket.localPort, _this.workerName, _this.workerPass, function(result) {
            _this.authorized = (!result.error && result.authorized);
            if (replyToSocket) {
                sendJson({
                    id: message.id,
                    result: _this.authorized,
                    error: result.error
                });
            }
            if (result.disconnect === true) {
                options.socket.destroy();
            }
        });
    }

    // Manage Stratum Submission
    function handleSubmit(message) {
        if (!_this.authorized) {
            sendJson({
                id: message.id,
                result: null,
                error: [24, "unauthorized worker", null]
            });
            considerBan(false);
            return;
        }
        if (!_this.extraNonce1) {
            sendJson({
                id: message.id,
                result: null,
                error: [25, "not subscribed", null]
            });
            considerBan(false);
            return;
        }
        _this.emit('submit', message, function(error, result) {
            if (!considerBan(result)) {
                sendJson({
                    id: message.id,
                    result: result,
                    error: error
                });
            }
        });
    }

    // Manage JSON Functionality
    function sendJson() {
        let response = '';
        for (let i = 0; i < arguments.length; i += 1) {
            response += JSON.stringify(arguments[i]) + '\n';
        }
        options.socket.write(response);
    }

    // Get Label of Stratum Client
    this.getLabel = function() {
        return (_this.workerName || '(unauthorized)') + ' [' + _this.remoteAddress + ']';
    };

    // Push Updated Difficulty to Difficulty Queue
    this.enqueueNextDifficulty = function(requestedNewDifficulty) {
        pendingDifficulty = requestedNewDifficulty;
        return true;
    };

    // Broadcast Difficulty to Stratum Client
    this.sendDifficulty = function(difficulty) {
        if (difficulty === this.difficulty) {
            return false;
        }
        _this.previousDifficulty = _this.difficulty;
        _this.difficulty = difficulty;
        sendJson({
            id: null,
            method: "mining.set_difficulty",
            params: [difficulty],
        });
        return true;
    };

    // Broadcast Mining Job to Stratum Client
    this.sendMiningJob = function(jobParams) {
        let lastActivityAgo = Date.now() - _this.lastActivity;
        if (lastActivityAgo > options.connectionTimeout * 1000) {
            _this.emit('socketTimeout', 'last submitted a share was ' + (lastActivityAgo / 1000 | 0) + ' seconds ago');
            _this.socket.destroy();
            return;
        }
        if (pendingDifficulty != null) {
            let result = _this.sendDifficulty(pendingDifficulty);
            pendingDifficulty = null;
            if (result) {
                _this.emit('difficultyChanged', _this.difficulty);
            }
        }
        sendJson({
            id: null,
            method: "mining.notify",
            params: jobParams
        });
    };

    // Initialize Stratum Connection
    this.init = initializeClient;
};

/**
 * The actual stratum server.
 * It emits the following Events:
 *   - 'client.connected'(StratumClientInstance) - when a new miner connects
 *   - 'client.disconnected'(StratumClientInstance) - when a miner disconnects. Be aware that the socket cannot be used anymore.
 *   - 'started' - when the server is up and running
 **/

// Stratum Client Main Function
let StratumNetwork = function(options, authorizeFn) {

    // Establish Stratum Variables
    let _this = this;
    this.stratumClients = {};
    this.stratumServers = {};
    this.bannedIPs = {}

    let subscriptionCounter = SubscriptionCounter();
    let rebroadcastTimeout;

    // Determine Length of Client Ban
    let bannedMS = options.banning ? options.banning.time * 1000 : null;

    // Initialize Stratum Connection
    this.initializeServer = function() {

        // Interval to Clear Old Bans from BannedIPs
        if (options.banning && options.banning.enabled) {
            setInterval(function() {
                for (ip in _this.bannedIPs) {
                    let banTime = _this.bannedIPs[ip];
                    if (Date.now() - banTime > options.banning.time)
                        delete _this.bannedIPs[ip];
                }
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
            var server = net.createServer({allowHalfOpen: false}, function(socket) {
                _this.handleNewClient(socket);
            })
            server.listen(parseInt(port), function() {
                serversStarted += 1;
                if (serversStarted == stratumPorts.length) {
                    // Emit Starting Message
                    _this.emit('started');
                }
            });
            _this.stratumServers[port] = server;
        });
    }

    // Stop Stratum Connection
    this.stopServer = function() {

        // Filter Individual Stratum Ports
        let stratumPorts = Object.keys(options.ports);
        stratumPorts = stratumPorts.filter(function(port) {
            return options.ports[port].enabled === true;
        });

        // Start Individual Stratum Servers
        stratumPorts.forEach(function(port) {
            var server = _this.stratumServers[port];
            server.close();
        });

        // Emit Stopping Message
        _this.emit('stopped');
    }

    // Check Regarding Banned Clients
    this.checkBan = function(client) {
        if (options.banning && options.banning.enabled && client.remoteAddress in _this.bannedIPs) {
            let bannedTime = _this.bannedIPs[client.remoteAddress];
            let bannedTimeAgo = Date.now() - bannedTime;
            let timeLeft = bannedMS - bannedTimeAgo;
            if (timeLeft > 0) {
                client.socket.destroy();
                client.emit('kickedBannedIP', timeLeft / 1000 | 0);
            }
            else {
                delete _this.bannedIPs[client.remoteAddress];
                client.emit('forgaveBannedIP');
            }
        }
    }

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
        })

        // Return Client Subscription ID
        client.init();
        return subscriptionId;
    };

    // Broadcast New Jobs to Clients
    this.broadcastMiningJobs = function(jobParams) {
        for (let clientId in _this.stratumClients) {
            let client = _this.stratumClients[clientId];
            client.sendMiningJob(jobParams);
        }
        clearTimeout(rebroadcastTimeout);
        rebroadcastTimeout = setTimeout(function() {
            _this.emit('broadcastTimeout');
        }, options.jobRebroadcastTimeout * 1000);
    };

    // Add Banned IP to List of Banned IPs
    this.addBannedIP = function(ipAddress) {
        _this.bannedIPs[ipAddress] = Date.now();
    };

    // Initialize Stratum Connection
    let connection = _this.initializeServer();
};

// Export Stratum Client/Server
exports.network = StratumNetwork;
StratumClient.prototype.__proto__ = events.EventEmitter.prototype;
StratumNetwork.prototype.__proto__ = events.EventEmitter.prototype;
