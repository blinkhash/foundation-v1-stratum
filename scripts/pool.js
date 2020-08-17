/*
 *
 * Pool (Updated)
 *
 */

// Import Required Modules
var events = require('events');
var async = require('async');
var util = require('./util.js');

// Import Required Modules
var Difficulty = require('./difficulty.js');
var Daemon = require('./daemon.js');
var Manager = require('./manager.js');
var Peer = require('./peer.js');
var Stratum = require('./stratum.js');

// Pool Main Function
var Pool = function(options, authorizeFn) {

    // Establish Pool Variables
    var _this = this;
    var blockPollingIntervalId;
    var emitLog = function(text) { _this.emit('log', 'debug'  , text); };
    var emitWarningLog = function(text) { _this.emit('log', 'warning', text); };
    var emitErrorLog = function(text) { _this.emit('log', 'error'  , text); };
    var emitSpecialLog = function(text) { _this.emit('log', 'special', text); };

    // Check if Algorithm is Supported
    this.options = options;
    if (!(options.coin.algorithm in algorithms)) {
        emitErrorLog('The ' + options.coin.algorithm + ' hashing algorithm is not supported.');
        throw new Error();
    }

    // Process Block when Found
    this.processBlockNotify = function(blockHash, sourceTrigger) {
        emitLog('Block notification via ' + sourceTrigger);
        if (typeof(_this.manager.currentJob) !== 'undefined' && blockHash !== _this.manager.currentJob.rpcData.previousblockhash) {
            getBlockTemplate(function(error, result) {
                if (error) {
                    emitErrorLog('Block notify error getting block template for ' + options.coin.name);
                }
            });
        }
    };

    // Configure Port Difficulty
    this.setDifficulty = function(port, difficultyConfig) {
        if (typeof(_this.difficulty[port]) != 'undefined' ) {
            _this.difficulty[port].removeAllListeners();
        }
        var difficultyInstance = new Difficulty(port, difficultyConfig);
        _this.difficulty[port] = difficultyInstance;
        _this.difficulty[port].on('newDifficulty', function(client, newDiff) {
            client.enqueueNextDifficulty(newDiff);
        });
    };

    // Initialize Pool Server
    this.start = function() {
        setupDifficulty();
        setupAPI();
        setupDaemonInterface(function() {
            setupPoolData(function() {
                setupRecipients();
                setupJobManager();
                syncBlockchain(function() {
                    setupFirstJob(function() {
                        setupBlockPolling();
                        setupPeer();
                        startStratumServer(function() {
                            outputPoolInfo();
                            _this.emit('started');
                        });
                    });
                });
            });
        });
    };

    // Initialize Pool Difficulty
    function setupDifficulty() {
        _this.difficulty = {};
        Object.keys(options.ports).forEach(function(port) {
            if (options.ports[port].difficulty)
                _this.setDifficulty(port, options.ports[port].difficulty);
        });
    }

    // Initialize Pool API
    function setupAPI() {
        if (typeof(options.api) !== 'object' || typeof(options.api.start) !== 'function') {
            return;
        }
        else {
            options.api.start(_this);
        }
    }

    // Initialize Pool Daemon
    function setupDaemonInterface(callback) {

        // Check to Ensure Daemons are Configured
        if (!Array.isArray(options.daemons) || options.daemons.length < 1) {
            emitErrorLog('No daemons have been configured - pool cannot start');
            return;
        }

        // Establish Daemon
        _this.daemon = new Daemon.interface(options.daemons, function(severity, message) {
            _this.emit('log', severity , message);
        });

        // Establish Online Functionality
        _this.daemon.once('online', function() {
            callback();
        });

        // Establish Failed Connection Functionality
        _this.daemon.on('connectionFailed', function(error) {
            emitErrorLog('Failed to connect daemon(s): ' + JSON.stringify(error));
        });

        // Establish Error Functionality
        _this.daemon.on('error', function(message) {
            emitErrorLog(message);
        });

        // Initialize Daemon
        _this.daemon.init();
    }

    // Initialize Pool Data
    function setupPoolData(callback) {

        // Define Initial RPC Calls
        var batchRPCCommand = [
            ['validateaddress', [options.addresses.address]],
            ['getdifficulty', []],
            ['getmininginfo', []],
            ['submitblock', []]
        ];

        // Check if Coin has GetInfo Defined
        if (options.coin.hasGetInfo) {
            batchRPCCommand.push(['getinfo', []]);
        }
        else {
            batchRPCCommand.push(['getblockchaininfo', []], ['getnetworkinfo', []]);
        }

        // Manage RPC Batches
        _this.daemon.batchCmd(batchRPCCommand, function(error, results) {
            if (error || !results) {
                emitErrorLog('Could not start pool, error with init batch RPC call: ' + JSON.stringify(error));
                return;
            }

            // Check Results of Each RPC Call
            var rpcResults = {};
            for (var i = 0; i < results.length; i++) {
                var rpcCall = batchRPCCommand[i][0];
                var r = results[i];
                rpcResults[rpcCall] = r.result || r.error;

                if (rpcCall !== 'submitblock' && (r.error || !r.result)) {
                    emitErrorLog('Could not start pool, error with init RPC ' + rpcCall + ' - ' + JSON.stringify(r.error));
                    return;
                }
            }

            // Check Pool Address is Valid
            if (!rpcResults.validateaddress.isvalid) {
                emitErrorLog('Daemon reports address is not valid');
                return;
            }

            // Set Coin Reward System
            if (!options.coin.reward) {
                options.coin.reward = 'POW';
            }

            // Check if Mainnet/Testnet is Active
            options.testnet = (rpcResults.getblockchaininfo.chain === 'test') ? true : false;
            options.network = (options.testnet ? options.coin.testnet : options.coin.mainnet);

            // Establish Pool Address Script
            options.poolAddressScript = (function() {
                return util.addressToScript(options.network, rpcResults.validateaddress.address);
            })();

            // Establish Coin Protocol Version
            options.protocolVersion = options.coin.hasGetInfo ? rpcResults.getinfo.protocolversion : rpcResults.getnetworkinfo.protocolversion;
            var difficulty = options.coin.hasGetInfo ? rpcResults.getinfo.difficulty : rpcResults.getblockchaininfo.difficulty;
            if (typeof(difficulty) == 'object') {
                difficulty = difficulty['proof-of-work'];
            }

            // Establish Coin Initial Statistics
            options.initStats = {
                connections: (options.coin.hasGetInfo ? rpcResults.getinfo.connections : rpcResults.getnetworkinfo.connections),
                difficulty: difficulty * algorithms[options.coin.algorithm].multiplier,
                networkHashRate: rpcResults.getmininginfo.networkhashps
            };

            // Check if Pool is Able to Submit Blocks
            if (rpcResults.submitblock.message === 'Method not found') {
                options.hasSubmitMethod = false;
            }
            else if (rpcResults.submitblock.code === -1) {
                options.hasSubmitMethod = true;
            }
            else {
                emitErrorLog('Could not detect block submission RPC method, ' + JSON.stringify(results));
                return;
            }

            // Send Callback
            callback();
        });
    }

    // Initialize Pool Recipients
    function setupRecipients() {
        var recipients = [];
        options.feePercent = 0;
        options.rewardRecipients = options.rewardRecipients || {};
        for (var r in options.rewardRecipients) {
            var percent = options.rewardRecipients[r];
            var rObj = {
                percent: percent / 100
            };
            try {
                if (r.length === 40)
                    rObj.script = util.miningKeyToScript(r);
                else
                    rObj.script = util.addressToScript(options.network, r);
                recipients.push(rObj);
                options.feePercent += percent;
            }
            catch(e) {
                emitErrorLog('Error generating transaction output script for ' + r + ' in rewardRecipients');
            }
        }
        if (recipients.length === 0) {
            emitErrorLog('No rewardRecipients have been setup which means no fees will be taken');
        }
        options.recipients = recipients;
    }

    // Check Whether Block was Accepted by Daemon
    function checkBlockAccepted(blockHash, callback) {
        _this.daemon.cmd('getblock', [blockHash], function(results) {
            var validResults = results.filter(function(result) {
                return result.response && (result.response.hash === blockHash)
            });
            if (validResults.length >= 1) {
                callback(true, validResults[0].response.tx[0]);
            }
            else {
                callback(false);
            }
        });
    }

    // Load Current Block Template
    function getBlockTemplate(callback) {
        _this.daemon.cmd('getblocktemplate',
            [{"capabilities": [ "coinbasetxn", "workid", "coinbase/append" ], "rules": [ "segwit" ]}],
            function(result) {
                if (result.error) {
                    emitErrorLog('getblocktemplate call failed for daemon instance ' +
                        result.instance.index + ' with error ' + JSON.stringify(result.error));
                    callback(result.error);
                }
                else {
                    var processedNewBlock = _this.manager.processTemplate(result.response);
                    callback(null, result.response, processedNewBlock);
                    callback = function() {};
                }
            }, true
        );
    }

    // Submit Block to Stratum Server
    function submitBlock(blockHex, callback) {

        // Check which Submit Method is Supported
        var rpcCommand, rpcArgs;
        if (options.hasSubmitMethod) {
            rpcCommand = 'submitblock';
            rpcArgs = [blockHex];
        }
        else {
            rpcCommand = 'getblocktemplate';
            rpcArgs = [{'mode': 'submit', 'data': blockHex}];
        }

        // Establish Submission Functionality
        _this.daemon.cmd(rpcCommand,
            rpcArgs,
            function(results) {
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    if (result.error) {
                        emitErrorLog('RPC error with daemon instance ' +
                                result.instance.index + ' when submitting block with ' + rpcCommand + ' ' +
                                JSON.stringify(result.error)
                        );
                        return;
                    }
                    else if (result.response === 'rejected') {
                        emitErrorLog('Daemon instance ' + result.instance.index + ' rejected a supposedly valid block');
                        return;
                    }
                }
                emitLog('Submitted Block using ' + rpcCommand + ' successfully to daemon instance(s)');
                callback();
            }
        );
    }

    // Initialize Pool Job Manager
    function setupJobManager() {

        // Establish Manager
        _this.manager = new Manager(options);

        // Establish Log Functionality
        _this.manager.on('log', function(severity, message) {
            _this.emit('log', severity, message);
        });

        // Establish New Block Functionality
        _this.manager.on('newBlock', function(blockTemplate) {
            if (_this.stratumServer) {
                _this.stratumServer.broadcastMiningJobs(blockTemplate.getJobParams());
            }
        });

        // Establish Share Functionality
        _this.manager.on('share', function(shareData, blockHex) {
            var isValidShare = !shareData.error;
            var isValidBlock = !!blockHex;
            var emitShare = function() {
                _this.emit('share', isValidShare, isValidBlock, shareData);
            };
            if (!isValidBlock)
                emitShare();
            else {
                submitBlock(blockHex, function() {
                    checkBlockAccepted(shareData.blockHash, function(isAccepted, tx) {
                        isValidBlock = isAccepted;
                        shareData.txHash = tx;
                        emitShare();
                        getBlockTemplate(function(error, result, foundNewBlock) {
                            if (foundNewBlock)
                                emitLog('Block notification via RPC after block submission');
                        });
                    });
                });
            }
        });

        // Establish Updated Block Functionality
        _this.manager.on('updatedBlock', function(blockTemplate) {
            if (_this.stratumServer) {
                var job = blockTemplate.getJobParams();
                job[8] = false;
                _this.stratumServer.broadcastMiningJobs(job);
            }
        });
    }

    // Wait Until Blockchain is Fully Synced
    function syncBlockchain(syncedCallback) {

        // Check for Blockchain to be Fully Synced
        var checkSynced = function(displayNotSynced) {
            _this.daemon.cmd('getblocktemplate', [{"capabilities": [ "coinbasetxn", "workid", "coinbase/append" ], "rules": [ "segwit" ]}], function(results) {
                var synced = results.every(function(r) {
                    return !r.error || r.error.code !== -10;
                });
                if (synced) {
                    syncedCallback();
                }
                else {
                    if (displayNotSynced) {
                        displayNotSynced();
                    }
                    setTimeout(checkSynced, 5000);
                    if (!process.env.forkId || process.env.forkId === '0') {
                        generateProgress();
                    }
                }
            });
        };

        // Check and Return Message if Not Synced
        checkSynced(function() {
            if (!process.env.forkId || process.env.forkId === '0') {
                emitErrorLog('Daemon is still syncing with network (download blockchain) - server will be started once synced');
            }
        });

        // Calculate Current Progress on Sync
        var generateProgress = function() {
            var cmd = options.coin.hasGetInfo ? 'getinfo' : 'getblockchaininfo';
            _this.daemon.cmd(cmd, [], function(results) {
                var blockCount = results.sort(function(a, b) {
                    return b.response.blocks - a.response.blocks;
                })[0].response.blocks;

                // Compare with Peers to Get Percentage Synced
                _this.daemon.cmd('getpeerinfo', [], function(results) {
                    var peers = results[0].response;
                    var totalBlocks = peers.sort(function(a, b) {
                        return b.startingheight - a.startingheight;
                    })[0].startingheight;
                    var percent = (blockCount / totalBlocks * 100).toFixed(2);
                    emitWarningLog('Downloaded ' + percent + '% of blockchain from ' + peers.length + ' peers');
                });
            });
        };
    }

    // Initialize Pool First Job
    function setupFirstJob(callback) {

        // Establish First Block Template
        getBlockTemplate(function(error, result) {
            if (error) {
                emitErrorLog('Error with getblocktemplate on creating first job, server cannot start');
                return;
            }

            // Check for Difficulty/Warnings
            var portWarnings = [];
            var networkDiffAdjusted = options.initStats.difficulty;
            Object.keys(options.ports).forEach(function(port) {
                var portDiff = options.ports[port].diff;
                if (networkDiffAdjusted < portDiff)
                    portWarnings.push('port ' + port + ' w/ diff ' + portDiff);
            });
            if (portWarnings.length > 0 && (!process.env.forkId || process.env.forkId === '0')) {
                var warnMessage = 'Network diff of ' + networkDiffAdjusted + ' is lower than '
                    + portWarnings.join(' and ');
                emitWarningLog(warnMessage);
            }

            // Send Callback
            callback();
        });
    }

    // Initialize Pool Block Polling
    function setupBlockPolling() {
        if (typeof options.blockRefreshInterval !== "number" || options.blockRefreshInterval <= 0) {
            emitLog('Block template polling has been disabled');
            return;
        }
        var pollingInterval = options.blockRefreshInterval;
        blockPollingIntervalId = setInterval(function() {
            getBlockTemplate(function(error, result, foundNewBlock) {
                if (foundNewBlock)
                    emitLog('Block notification via RPC polling');
            });
        }, pollingInterval);
    }

    // Initialize Pool Peers
    function setupPeer() {

        // Check for P2P Configuration
        if (!options.p2p || !options.p2p.enabled)
            return;
        if (options.testnet && !options.coin.peerMagicTestnet) {
            emitErrorLog('p2p cannot be enabled in testnet without peerMagicTestnet set in coin configuration');
            return;
        }
        else if (!options.coin.peerMagic) {
            emitErrorLog('p2p cannot be enabled without peerMagic set in coin configuration');
            return;
        }

        // Establish Peer
        _this.peer = new Peer(options);

        // Establish Connection Functionality
        _this.peer.on('connected', function() {});
        _this.peer.on('disconnected', function() {});

        // Establish Rejected Connection Functionality
        _this.peer.on('connectionRejected', function() {
            emitErrorLog('p2p connection failed - likely incorrect p2p magic value');
        });

        // Establish Failed Connection Functionality
        _this.peer.on('connectionFailed', function(e) {
            emitErrorLog('p2p connection failed - likely incorrect host or port');
        });

        // Establish Socket Error Functionality
        _this.peer.on('socketError', function(e) {
            emitErrorLog('p2p had a socket error ' + JSON.stringify(e));
        });

        // Establish Error Functionality
        _this.peer.on('error', function(msg) {
            emitWarningLog('p2p had an error ' + msg);
        });

        // Establish Found Block Functionality
        _this.peer.on('blockFound', function(hash) {
            _this.processBlockNotify(hash, 'p2p');
        });
    }

    // Start Pool Stratum Server
    function startStratumServer(callback) {

        // Establish Stratum Server
        _this.stratumServer = new Stratum.server(options, authorizeFn);

        // Establish Started Functionality
        _this.stratumServer.on('started', function() {
            var stratumPorts = Object.keys(options.ports);
            stratumPorts = stratumPorts.filter(function(port) {
                return options.ports[port].enabled === true;
            });
            options.initStats.stratumPorts = stratumPorts
            _this.stratumServer.broadcastMiningJobs(_this.manager.currentJob.getJobParams());
            callback();
        })

        // Establish Timeout Functionality
        _this.stratumServer.on('broadcastTimeout', function() {
            if (options.debug) {
                emitLog('No new blocks for ' + options.jobRebroadcastTimeout + ' seconds - updating transactions & rebroadcasting work');
            }
            _this.daemon.cmd('getblocktemplate', [], function() {});
            getBlockTemplate(function(error, rpcData, processedBlock) {
                if (error || processedBlock) return;
                _this.manager.updateCurrentJob(rpcData);
            });
        })

        // Establish New Connection Functionality
        _this.stratumServer.on('client.connected', function(client) {

            // Manage/Record Client Difficulty
            if (typeof(_this.difficulty[client.socket.localPort]) !== 'undefined') {
                _this.difficulty[client.socket.localPort].manageClient(client);
            }

            // Establish Client Difficulty Functionality
            client.on('difficultyChanged', function(diff) {
                _this.emit('difficultyUpdate', client.workerName, diff);
            })

            // Establish Client Subscription Functionality
            client.on('subscription', function(params, resultCallback) {
                var extraNonce = _this.manager.extraNonceCounter.next();
                var extraNonce2Size = _this.manager.extraNonce2Size;
                resultCallback(null, extraNonce, extraNonce2Size);
                if (typeof(options.ports[client.socket.localPort]) !== 'undefined' && options.ports[client.socket.localPort].diff) {
                    this.sendDifficulty(options.ports[client.socket.localPort].diff);
                }
                else {
                    this.sendDifficulty(8);
                }
                this.sendMiningJob(_this.manager.currentJob.getJobParams());
            })

            // Establish Client Submission Functionality
            client.on('submit', function(params, resultCallback) {
                var result =_this.manager.processShare(
                    params.jobId,
                    client.previousDifficulty,
                    client.difficulty,
                    client.extraNonce1,
                    params.extraNonce2,
                    params.nTime,
                    params.nonce,
                    client.remoteAddress,
                    client.socket.localPort,
                    params.name
                );
                resultCallback(result.error, result.result ? true : null);
            })

            // Establish Client Error Messaging Functionality
            client.on('malformedMessage', function(message) {});

            // Establish Client Socket Error Functionality
            client.on('socketError', function(e) {
                emitWarningLog('Socket error from ' + client.getLabel() + ': ' + JSON.stringify(e));
            })

            // Establish Client Socket Timeout Functionality
            client.on('socketTimeout', function(reason) {
                emitWarningLog('Connected timed out for ' + client.getLabel() + ': ' + reason)
            })

            // Establish Client Disconnect Functionality
            client.on('socketDisconnect', function() {})

            // Establish Client Banned Functionality
            client.on('kickedBannedIP', function(remainingBanTime) {
                emitLog('Rejected incoming connection from ' + client.remoteAddress + ' banned for ' + remainingBanTime + ' more seconds');
            })

            // Establish Client Forgiveness Functionality
            client.on('forgaveBannedIP', function() {
                emitLog('Forgave banned IP ' + client.remoteAddress);
            })

            // Establish Client Unknown Stratum Functionality
            client.on('unknownStratumMethod', function(fullMessage) {
                emitLog('Unknown stratum method from ' + client.getLabel() + ': ' + fullMessage.method);
            })

            // Establish Client DDOS Functionality
            client.on('socketFlooded', function() {
                emitWarningLog('Detected socket flooding from ' + client.getLabel());
            })

            // Establish Client TCP Error Functionality
            client.on('tcpProxyError', function(data) {
                emitErrorLog('Client IP detection failed, tcpProxyProtocol is enabled yet did not receive proxy protocol message, instead got data: ' + data);
            })

            // Establish Client Banning Functionality
            client.on('triggerBan', function(reason) {
                emitWarningLog('Banned triggered for ' + client.getLabel() + ': ' + reason);
                _this.emit('banIP', client.remoteAddress, client.workerName);
            });
        });
    }

    // Output Derived Pool Information
    function outputPoolInfo() {
        var startMessage = 'Stratum Pool Server Started for ' + options.coin.name +
            ' [' + options.coin.symbol.toUpperCase() + '] {' + options.coin.algorithm + '}';
        if (process.env.forkId && process.env.forkId !== '0') {
            emitLog(startMessage);
            return;
        }
        var infoLines = [startMessage,
                'Network Connected:\t' + (options.testnet ? 'Testnet' : 'Mainnet'),
                'Detected Reward Type:\t' + options.coin.reward,
                'Current Block Height:\t' + _this.manager.currentJob.rpcData.height,
                'Current Connect Peers:\t' + options.initStats.connections,
                'Current Block Diff:\t' + _this.manager.currentJob.difficulty * algorithms[options.coin.algorithm].multiplier,
                'Network Difficulty:\t' + options.initStats.difficulty,
                'Stratum Port(s):\t' + _this.options.initStats.stratumPorts.join(', '),
                'Pool Fee Percent:\t' + _this.options.feePercent + '%'
        ];
        if (typeof options.blockRefreshInterval === "number" && options.blockRefreshInterval > 0)
            infoLines.push('Block Polling Every:\t' + options.blockRefreshInterval + ' ms');
        emitSpecialLog(infoLines.join('\n\t\t\t\t\t\t'));
    }
};

module.exports = Pool;
Pool.prototype.__proto__ = events.EventEmitter.prototype;
