/*
 *
 * Stratum (Updated)
 *
 */

// Import Required Modules
var net = require('net');
var events = require('events');
var util = require('./util.js');

// Increment Count for Each Subscription
var SubscriptionCounter = function() {
    var count = 0;
    var padding = 'deadbeefcafebabe';
    return {
        next: function() {
            count++;
            if (Number.MAX_VALUE === count) count = 0;
            return padding + util.packInt64LE(count).toString('hex');
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
var StratumClient = function(options) {

    // Establish Private Stratum Variables
    var _this = this;
    var algorithm = options.algorithm
    var banning = options.banning;
    var pendingDifficulty = null;

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
        var totalShares = _this.shares.valid + _this.shares.invalid;
        if (totalShares >= banning.checkThreshold) {
            var percentBad = (_this.shares.invalid / totalShares) * 100;
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
    var considerBan = (!banning || !banning.enabled) ? banningDisabled : banningEnabled;

    // Initialize Stratum Connection
    function initializeClient() {
        setupSocket();
    }

    // Establish Stratum Connection
    function setupSocket() {

        // Setup Main Socket Connection
        var dataBuffer = '';
        var socket = options.socket;
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
                var messages = dataBuffer.split('\n');
                var incomplete = dataBuffer.slice(-1) === '\n' ? '' : messages.pop();
                messages.forEach(function(message) {
                    if (message === '') return;
                    var messageJson;
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
            if (err.code !== 'ECONNRESET')
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
        switch (algorithm) {

            // Equihash Subscription Handling
            case 'equihash':
                _this.emit('subscription', {}, function(error, extraNonce1, extraNonce1) {
                    if (error) {
                        sendJson({
                            id: message.id,
                            result: null,
                            error: error
                        });
                        return;
                    }
                    _this.extraNonce1 = extraNonce1;
                    sendJson({
                        id: message.id,
                        result: [
                            null,
                            extraNonce1,
                        ],
                        error: null
                    });
                });

            // Default Subscription Handling
            default:
                _this.emit('subscription', {}, function(error, extraNonce1, extraNonce2Size) {
                    if (error) {
                        sendJson({
                            id: message.id,
                            result: null,
                            error: error
                        });
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
        var response = '';
        for (var i = 0; i < arguments.length; i++) {
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
        switch (algorithm) {

          // Equihash Difficulty Handling
          case "equihash":
              if (difficulty === this.difficulty)
                  return false;
              _this.previousDifficulty = _this.difficulty;
              _this.difficulty = difficulty;
              var zeroPad;
              var powLimit = algorithms.equihash.diff;
              var adjPow = powLimit / difficulty;
              if ((64 - adjPow.toString(16).length) === 0) {
                  zeroPad = ''
              }
              else {
                  zeroPad = '0';
                  zeroPad = zeroPad.repeat((64 - (adjPow.toString(16).length)));
              }
              var target = (zeroPad + adjPow.toString(16)).substr(0, 64);
              sendJson({
                  id: null,
                  method: "mining.set_target",
                  params: [target],
              });
              return true;

          // Default Difficulty Handling
          default:
              if (difficulty === this.difficulty)
                  return false;
              _this.previousDifficulty = _this.difficulty;
              _this.difficulty = difficulty;
              sendJson({
                  id: null,
                  method: "mining.set_difficulty",
                  params: [difficulty],
              });
              return true;
        }
    };

    // Broadcast Mining Job to Stratum Client
    this.sendMiningJob = function(jobParams) {
        var lastActivityAgo = Date.now() - _this.lastActivity;
        if (lastActivityAgo > options.connectionTimeout * 1000) {
            _this.emit('socketTimeout', 'last submitted a share was ' + (lastActivityAgo / 1000 | 0) + ' seconds ago');
            _this.socket.destroy();
            return;
        }
        if (pendingDifficulty !== null) {
            var result = _this.sendDifficulty(pendingDifficulty);
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

    // Manually Authorize Stratum Client
    this.manuallyAuthClient = function (username, password) {
        handleAuthorize({id: 1, params: [username, password]}, false);
    };

    // Manually Copy Values from Stratum Client
    this.manuallySetValues = function (otherClient) {
        _this.extraNonce1 = otherClient.extraNonce1;
        _this.previousDifficulty = otherClient.previousDifficulty;
        _this.difficulty = otherClient.difficulty;
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
var StratumServer = function(options, authorizeFn) {

    // Establish Private Stratum Variables
    var _this = this;
    var stratumClients = {};
    var subscriptionCounter = SubscriptionCounter();
    var rebroadcastTimeout;
    var bannedIPs = {};

    // Determine Length of Client Ban
    var bannedMS = options.banning ? options.banning.time * 1000 : null;

    // Check Regarding Banned Clients
    function checkBan(client) {
        if (options.banning && options.banning.enabled && client.remoteAddress in bannedIPs) {
            var bannedTime = bannedIPs[client.remoteAddress];
            var bannedTimeAgo = Date.now() - bannedTime;
            var timeLeft = bannedMS - bannedTimeAgo;
            if (timeLeft > 0) {
                client.socket.destroy();
                client.emit('kickedBannedIP', timeLeft / 1000 | 0);
            }
            else {
                delete bannedIPs[client.remoteAddress];
                client.emit('forgaveBannedIP');
            }
        }
    }

    // Initialize Stratum Connection
    function initializeServer() {

        // Interval to Clear Old Bans from BannedIPs
        if (options.banning && options.banning.enabled) {
            setInterval(function() {
                for (ip in bannedIPs) {
                    var banTime = bannedIPs[ip];
                    if (Date.now() - banTime > options.banning.time)
                        delete bannedIPs[ip];
                }
            }, 1000 * options.banning.purgeInterval);
        }

        // Start Individual Stratum Ports
        var serversStarted = 0;
        var stratumPorts = Object.keys(options.ports);
        stratumPorts = stratumPorts.filter(function(port) {
            return options.ports[port].enabled === true;
        });

        // Start Individual Stratum Servers
        stratumPorts.forEach(function(port) {
            net.createServer({allowHalfOpen: false}, function(socket) {
                _this.handleNewClient(socket);
            }).listen(parseInt(port), function() {
                serversStarted++;
                if (serversStarted == stratumPorts.length) {
                    _this.emit('started');
                }
            });
        });
    }

    // Manage New Client Connections
    this.handleNewClient = function (socket) {

        // Establish New Stratum Client
        socket.setKeepAlive(true);
        var subscriptionId = subscriptionCounter.next();
        var client = new StratumClient({
            subscriptionId: subscriptionId,
            authorizeFn: authorizeFn,
            socket: socket,
            banning: options.banning,
            connectionTimeout: options.connectionTimeout,
            tcpProxyProtocol: options.tcpProxyProtocol
        });
        stratumClients[subscriptionId] = client;

        // Manage Client Behaviors
        _this.emit('client.connected', client);
        client.on('socketDisconnect', function() {
            _this.manuallyRemoveStratumClient(subscriptionId);
            _this.emit('client.disconnected', client);
        }).on('checkBan', function() {
            checkBan(client);
        }).on('triggerBan', function() {
            _this.addBannedIP(client.remoteAddress);
        }).init();

        // Return Client Subscription ID
        return subscriptionId;
    };

    // Broadcast New Jobs to Clients
    this.broadcastMiningJobs = function(jobParams) {
        for (var clientId in stratumClients) {
            var client = stratumClients[clientId];
            client.sendMiningJob(jobParams);
        }
        clearTimeout(rebroadcastTimeout);
        rebroadcastTimeout = setTimeout(function() {
            _this.emit('broadcastTimeout');
        }, options.jobRebroadcastTimeout * 1000);
    };

    // Add Banned IP to List of Banned IPs
    this.addBannedIP = function(ipAddress) {
        bannedIPs[ipAddress] = Date.now();
    };

    // Return Current Connected Clients
    this.getStratumClients = function () {
        return stratumClients;
    };

    // Manually Add Stratum Client to Stratum Server
    this.manuallyAddStratumClient = function(clientObj) {
        var subId = _this.handleNewClient(clientObj.socket);
        if (subId != null) { // not banned!
            stratumClients[subId].manuallyAuthClient(clientObj.workerName, clientObj.workerPass);
            stratumClients[subId].manuallySetValues(clientObj);
        }
    };

    // Manually Remove Stratum Client from Stratum Server
    this.manuallyRemoveStratumClient = function (subscriptionId) {
        delete stratumClients[subscriptionId];
    };

    // Initialize Stratum Connection
    var connection = initializeServer();
};

// Export Stratum Client/Server
exports.server = StratumServer;
StratumClient.prototype.__proto__ = events.EventEmitter.prototype;
StratumServer.prototype.__proto__ = events.EventEmitter.prototype;
