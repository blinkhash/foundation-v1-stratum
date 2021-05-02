/*
 *
 * Pool (Updated)
 *
 */

const events = require('events');
const Algorithms = require('../main/algorithms');
const Difficulty = require('./difficulty.js');
const DaemonInterface = require('./daemon.js');
const Manager = require('./manager.js');
const Peer = require('./peer.js');
const Stratum = require('./stratum.js');

////////////////////////////////////////////////////////////////////////////////

// Main Pool Function
const Pool = function(options, authorizeFn, responseFn) {

    const _this = this;
    this.options = options;
    this.authorizeFn = authorizeFn;
    this.responseFn = responseFn;

    const emitLog = function(text) { _this.emit('log', 'debug', text); };
    const emitWarningLog = function(text) { _this.emit('log', 'warning', text); };
    const emitSpecialLog = function(text) { _this.emit('log', 'special', text); };
    const emitErrorLog = function(text) {
        _this.emit('log', 'error', text);
        _this.responseFn(text);
    };

    // Check if Algorithm is Supported
    if (!(_this.options.coin.algorithm in Algorithms)) {
        emitErrorLog('The ' + _this.options.coin.algorithm + ' hashing algorithm is not supported.');
        throw new Error();
    }

    // Process Block when Found
    /* istanbul ignore next */
    this.processBlockNotify = function(blockHash) {
        if (typeof(_this.manager.currentJob) !== 'undefined' && blockHash !== _this.manager.currentJob.rpcData.previousblockhash) {
            _this.getBlockTemplate(function(error) {
                if (error) {
                    emitErrorLog('Block notify error getting block template for ' + _this.options.coin.name);
                }
                else {
                    emitLog('Block template for ' + _this.options.coin.name + ' updated successfully');
                }
            });
        }
    };

    // Configure Port Difficulty
    /* istanbul ignore next */
    this.setDifficulty = function(port, difficultyConfig) {
        if (typeof(_this.difficulty[port]) != 'undefined') {
            _this.difficulty[port].removeAllListeners();
        }
        const difficultyInstance = new Difficulty(port, difficultyConfig, false);
        _this.difficulty[port] = difficultyInstance;
        _this.difficulty[port].on('newDifficulty', function(client, newDiff) {
            client.enqueueNextDifficulty(newDiff);
        });
    };

    // Start Pool Capabilities
    /* istanbul ignore next */
    this.setupPool = function() {
        _this.setupDifficulty();
        _this.setupDaemonInterface(function() {
            _this.setupPoolData(function() {
                _this.setupRecipients();
                _this.setupJobManager();
                _this.setupBlockchain(function() {
                    _this.setupFirstJob(function() {
                        _this.setupBlockPolling();
                        _this.setupPeer();
                        _this.setupStratum(function() {
                            _this.outputPoolInfo();
                            _this.emit('started');
                        });
                    });
                });
            });
        });
    };

    // Initialize Pool Difficulty
    /* istanbul ignore next */
    this.setupDifficulty = function() {
        _this.difficulty = {};
        Object.keys(_this.options.ports).forEach(function(port) {
            if (_this.options.ports[port].difficulty)
                _this.setDifficulty(port, _this.options.ports[port].difficulty);
        });
    };

    // Initialize Pool Daemon
    this.setupDaemonInterface = function(callback) {

        // Check to Ensure Daemons are Configured
        if (!Array.isArray(_this.options.daemons) || _this.options.daemons.length < 1) {
            emitErrorLog('No daemons have been configured - pool cannot start');
            return;
        }

        // Establish Daemon Interface
        _this.daemon = new DaemonInterface(_this.options.daemons, function(severity, message) {
            _this.emit('log', severity , message);
        });
        _this.daemon.once('online', function() {
            callback();
        });
        _this.daemon.on('connectionFailed', function(error) {
            emitErrorLog('Failed to connect daemon(s): ' + JSON.stringify(error));
        });
        _this.daemon.initDaemons(function() {});
    };

    // Initialize Pool Data
    /* istanbul ignore next */
    this.setupPoolData = function(callback) {
        const batchRPCCommand = [
            ['validateaddress', [_this.options.address]],
            ['getmininginfo', []],
            ['submitblock', []]
        ];

        // Check if Coin has GetInfo Defined
        if (_this.options.coin.hasGetInfo) {
            batchRPCCommand.push(['getinfo', []]);
        }
        else {
            batchRPCCommand.push(['getblockchaininfo', []], ['getnetworkinfo', []]);
        }

        // Manage RPC Batches
        _this.daemon.batchCmd(batchRPCCommand, function(error, results) {
            if (error || !results) {
                emitErrorLog('Could not start pool, error with init batch RPC call');
                return;
            }

            // Check Results of Each RPC Call
            const rpcResults = {};
            results.forEach((output, idx) => {
                const rpcCall = batchRPCCommand[idx][0];
                rpcResults[rpcCall] = output.result || output.error;
                if (rpcCall !== 'submitblock' && (output.error || !output.result)) {
                    emitErrorLog('Could not start pool, error with init RPC call: ' + rpcCall + ' - ' + JSON.stringify(output.error));
                    return;
                }
            });

            // Check Pool Address is Valid
            if (!rpcResults.validateaddress.isvalid) {
                emitErrorLog('Daemon reports address is not valid');
                return;
            }

            // Check if Mainnet/Testnet is Active
            if (_this.options.coin.hasGetInfo) {
                _this.options.testnet = (rpcResults.getinfo.testnet === true) ? true : false;
            }
            else {
                _this.options.testnet = (rpcResults.getblockchaininfo.chain === 'test') ? true : false;
            }
            _this.options.network = (_this.options.testnet ? _this.options.coin.testnet : _this.options.coin.mainnet);

            // Establish Coin Protocol Version
            _this.options.poolAddress = rpcResults.validateaddress.address;
            _this.options.protocolVersion = _this.options.coin.hasGetInfo ? rpcResults.getinfo.protocolversion : rpcResults.getnetworkinfo.protocolversion;
            let difficulty = _this.options.coin.hasGetInfo ? rpcResults.getinfo.difficulty : rpcResults.getblockchaininfo.difficulty;
            if (typeof(difficulty) == 'object') {
                difficulty = difficulty['proof-of-work'];
            }

            // Establish Coin Initial Statistics
            _this.options.initStats = {
                connections: (_this.options.coin.hasGetInfo ? rpcResults.getinfo.connections : rpcResults.getnetworkinfo.connections),
                difficulty: difficulty * Algorithms[_this.options.coin.algorithm].multiplier,
                networkHashRate: rpcResults.getmininginfo.networkhashps
            };

            // Check if Pool is Able to Submit Blocks
            if (rpcResults.submitblock.message === 'Method not found') {
                _this.options.hasSubmitMethod = false;
            }
            else if (rpcResults.submitblock.code === -1) {
                _this.options.hasSubmitMethod = true;
            }
            else {
                emitErrorLog('Could not detect block submission RPC method');
                return;
            }

            callback();
        });
    };

    // Initialize Pool Recipients
    this.setupRecipients = function() {
        if (_this.options.recipients.length === 0) {
            emitErrorLog('No rewardRecipients have been setup which means no fees will be taken');
        }
        _this.options.feePercentage = 0;
        _this.options.recipients.forEach(recipient => {
            _this.options.feePercentage += recipient.percentage;
        });
    };

    // Submit Block to Stratum Server
    this.submitBlock = function(blockHex, callback) {

        // Check which Submit Method is Supported
        let rpcCommand, rpcArgs;
        if (_this.options.hasSubmitMethod) {
            rpcCommand = 'submitblock';
            rpcArgs = [blockHex];
        }
        else {
            rpcCommand = 'getblocktemplate';
            rpcArgs = [{'mode': 'submit', 'data': blockHex}];
        }

        // Establish Submission Functionality
        _this.daemon.cmd(rpcCommand, rpcArgs, function(results) {
            for (let i = 0; i < results.length; i += 1) {
                const result = results[i];
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
        });
    };

    // Check Whether Block was Accepted by Daemon
    this.checkBlockAccepted = function(blockHash, callback) {
        _this.daemon.cmd('getblock', [blockHash], function(results) {
            const validResults = results.filter(function(result) {
                return result.response && (result.response.hash === blockHash);
            });
            if (validResults.length >= 1) {
                if (validResults[0].response.confirmations >= 0) {
                    emitLog('Block was accepted by the network with ' + validResults[0].response.confirmations + ' confirmations');
                    callback(true, validResults[0].response.tx[0]);
                }
                else {
                    emitErrorLog('Block was rejected by the network');
                    callback(false);
                }
            }
            else {
                emitErrorLog('Block was rejected by the network');
                callback(false);
            }
        });
    };

    // Load Current Block Template
    this.getBlockTemplate = function(callback) {
        const callConfig = {
            'capabilities': [
                'coinbasetxn',
                'workid',
                'coinbase/append'
            ]
        };
        if (_this.options.coin.segwit) {
            callConfig.rules = ['segwit'];
        }

        // Handle Block Templates/Subsidy
        _this.daemon.cmd('getblocktemplate', [callConfig], function(result) {
            if (result.error) {
                emitErrorLog('getblocktemplate call failed for daemon instance ' +
                    result.instance.index + ' with error ' + JSON.stringify(result.error));
                callback(result.error);
            }
            else {
                const processedNewBlock = _this.manager.processTemplate(result.response);
                callback(null, result.response, processedNewBlock);
            }
        }, true);
    };

    // Initialize Pool Job Manager
    /* istanbul ignore next */
    this.setupJobManager = function() {

        // Establish Pool Manager
        _this.manager = new Manager(_this.options);
        _this.manager.on('newBlock', function(blockTemplate) {
            if (_this.stratum) {
                _this.stratum.broadcastMiningJobs(blockTemplate.getJobParams());
                if (_this.options.debug) {
                    emitLog('Established new job for updated block template');
                }
            }
        });

        _this.manager.on('share', function(shareData, blockHex) {
            const shareValid = !shareData.error;
            let blockValid = !!blockHex;
            if (!blockValid)
                _this.emit('share', shareData, shareValid, blockValid, () => {});
            else {
                _this.submitBlock(blockHex, function() {
                    _this.checkBlockAccepted(shareData.hash, function(isAccepted, tx) {
                        blockValid = isAccepted;
                        shareData.transaction = tx;
                        _this.emit('share', shareData, shareValid, blockValid, () => {});
                        _this.getBlockTemplate(function(error, result, foundNewBlock) {
                            if (foundNewBlock)
                                emitLog('Block notification via RPC after block submission');
                        });
                    });
                });
            }
        });

        _this.manager.on('updatedBlock', function(blockTemplate) {
            if (_this.stratum) {
                const job = blockTemplate.getJobParams();
                job[8] = false;
                _this.stratum.broadcastMiningJobs(job);
            }
        });
    };

    // Wait Until Blockchain is Fully Synced
    /* istanbul ignore next */
    this.setupBlockchain = function(callback) {
        const callConfig = {
            'capabilities': [
                'coinbasetxn',
                'workid',
                'coinbase/append'
            ]
        };
        if (_this.options.coin.segwit) {
            callConfig.rules = ['segwit'];
        }

        // Calculate Current Progress on Sync
        const generateProgress = function() {
            const cmd = _this.options.coin.hasGetInfo ? 'getinfo' : 'getblockchaininfo';
            _this.daemon.cmd(cmd, [], function(results) {
                const blockCount = Math.max.apply(null, results
                    .flatMap(result => result.response)
                    .flatMap(response => response.blocks));

                // Compare with Peers to Get Percentage Synced
                _this.daemon.cmd('getpeerinfo', [], function(results) {
                    const peers = results[0].response;
                    const totalBlocks = Math.max.apply(null, peers
                        .flatMap(response => response.startingheight));
                    const percent = (blockCount / totalBlocks * 100).toFixed(2);
                    emitWarningLog('Downloaded ' + percent + '% of blockchain from ' + peers.length + ' peers');
                });
            });
        };

        // Check for Blockchain to be Fully Synced
        const checkSynced = function(displayNotSynced) {
            _this.daemon.cmd('getblocktemplate', [callConfig], function(results) {
                const synced = results.every(function(r) {
                    return !r.error || r.error.code !== -10;
                });
                if (synced) {
                    callback();
                }
                else {
                    if (displayNotSynced) {
                        displayNotSynced();
                    }
                    setTimeout(checkSynced, 30000);
                    if (!process.env.forkId || process.env.forkId === '0') {
                        generateProgress();
                    }
                }
            });
        };

        // Check and Return Message if Not Synced
        checkSynced(function() {
            if (!process.env.forkId || process.env.forkId === '0') {
                emitErrorLog('Daemon is still syncing with the network. The server will be started once synced');
            }
        });
    };

    // Initialize First Pool Job
    /* istanbul ignore next */
    this.setupFirstJob = function(callback) {
        _this.getBlockTemplate(function(error) {
            if (error) {
                emitErrorLog('Error with getblocktemplate on creating first job, server cannot start');
                return;
            }
            const portWarnings = [];
            const networkDiffAdjusted = _this.options.initStats.difficulty;
            Object.keys(_this.options.ports).forEach(function(port) {
                const portDiff = _this.options.ports[port].initial;
                if (networkDiffAdjusted < portDiff)
                    portWarnings.push('port ' + port + ' w/ diff ' + portDiff);
            });
            if (portWarnings.length > 0 && (!process.env.forkId || process.env.forkId === '0')) {
                const warnMessage = 'Network diff of ' + networkDiffAdjusted + ' is lower than '
                    + portWarnings.join(' and ');
                emitWarningLog(warnMessage);
            }
            callback();
        });
    };

    // Initialize Pool Block Polling
    /* istanbul ignore next */
    this.setupBlockPolling = function() {
        if (typeof _this.options.blockRefreshInterval !== 'number' || _this.options.blockRefreshInterval <= 0) {
            emitLog('Block template polling has been disabled');
            return;
        }
        let pollingFlag = false;
        const pollingInterval = _this.options.blockRefreshInterval;
        setInterval(function() {
            if (pollingFlag === false) {
                pollingFlag = true;
                _this.getBlockTemplate(function(error, result, foundNewBlock) {
                    if (foundNewBlock) {
                        emitLog('Block notification via RPC polling');
                    }
                    pollingFlag = false;
                });
            }
        }, pollingInterval);
    };

    // Initialize Pool Peers
    this.setupPeer = function() {

        // Establish Peer Settings
        _this.options.verack = false;
        _this.options.validConnectionConfig = true;

        // Check for P2P Configuration
        if (!_this.options.p2p || !_this.options.p2p.enabled) {
            emitLog('p2p has been disabled in the configuration');
            return;
        }
        if (_this.options.testnet && !_this.options.coin.testnet.peerMagic) {
            emitErrorLog('p2p cannot be enabled in testnet without peerMagic set in testnet configuration');
            return;
        }
        else if (!_this.options.coin.mainnet.peerMagic) {
            emitErrorLog('p2p cannot be enabled without peerMagic set in mainnet configuration');
            return;
        }

        // Establish Peer Server
        _this.peer = new Peer(_this.options);
        _this.peer.on('blockFound', function(hash) {
            emitLog('Block notification via p2p');
            _this.processBlockNotify(hash);
        });
        _this.peer.on('connectionFailed', function() {
            emitErrorLog('p2p connection failed - likely incorrect host or port');
        });
        _this.peer.on('connectionRejected', function() {
            emitErrorLog('p2p connection failed - likely incorrect p2p magic value');
        });
        _this.peer.on('error', function(msg) {
            emitErrorLog('p2p had an error: ' + msg);
        });
        _this.peer.on('socketError', function(e) {
            emitErrorLog('p2p had a socket error: ' + JSON.stringify(e));
        });
    };

    // Start Pool Stratum Server
    /* istanbul ignore next */
    this.setupStratum = function(callback) {

        // Establish Stratum Server
        _this.stratum = new Stratum.network(_this.options, _this.authorizeFn);
        _this.stratum.on('started', function() {
            let stratumPorts = Object.keys(_this.options.ports);
            stratumPorts = stratumPorts.filter(function(port) {
                return _this.options.ports[port].enabled === true;
            });
            _this.options.initStats.stratumPorts = stratumPorts;
            _this.stratum.broadcastMiningJobs(_this.manager.currentJob.getJobParams());
            callback();
        });

        // Establish Timeout Functionality
        _this.stratum.on('broadcastTimeout', function() {
            if (_this.options.debug) {
                emitLog('No new blocks for ' + _this.options.jobRebroadcastTimeout + ' seconds - updating transactions & rebroadcasting work');
            }
            _this.getBlockTemplate(function(error, rpcData, processedBlock) {
                if (error || processedBlock) return;
                _this.manager.updateCurrentJob(rpcData);
                if (_this.options.debug) {
                    emitLog('Updated existing job for current block template');
                }
            });
        });

        // Establish New Connection Functionality
        _this.stratum.on('client.connected', function(client) {
            if (typeof(_this.difficulty[client.socket.localPort]) !== 'undefined') {
                _this.difficulty[client.socket.localPort].manageClient(client);
            }

            client.on('difficultyChanged', function(diff) {
                _this.emit('difficultyUpdate', client.workerName, diff);
            });

            // Establish Client Subscription Functionality
            client.on('subscription', function(params, callback) {
                const extraNonce = _this.manager.extraNonceCounter.next();
                const extraNonce2Size = _this.manager.extraNonce2Size;
                callback(null, extraNonce, extraNonce2Size);
                if (typeof(_this.options.ports[client.socket.localPort]) !== 'undefined' && _this.options.ports[client.socket.localPort].initial) {
                    client.sendDifficulty(_this.options.ports[client.socket.localPort].initial);
                }
                else {
                    client.sendDifficulty(8);
                }
                client.sendMiningJob(_this.manager.currentJob.getJobParams());
            });

            // Establish Client Submission Functionality
            client.on('submit', function(message, callback) {
                const result = _this.manager.processShare(
                    message.params[1],
                    client.previousDifficulty,
                    client.difficulty,
                    client.extraNonce1,
                    message.params[2],
                    message.params[3],
                    message.params[4],
                    client.remoteAddress,
                    client.socket.localPort,
                    message.params[0],
                    message.params[5],
                    client.versionMask,
                    client.asicBoost,
                );
                callback(result.error, result.result ? true : null);
            });

            // Establish Miscellaneous Client Functionality
            client.on('malformedMessage', function(message) {
                emitWarningLog('Malformed message from ' + client.getLabel() + ': ' + JSON.stringify(message));
            });
            client.on('socketError', function(e) {
                emitWarningLog('Socket error from ' + client.getLabel() + ': ' + JSON.stringify(e));
            });
            client.on('socketTimeout', function(reason) {
                emitWarningLog('Connection timed out for ' + client.getLabel() + ': ' + reason);
            });
            client.on('socketDisconnect', function() {
                emitWarningLog('Socket disconnect for ' + client.getLabel());
            });
            client.on('kickedBannedIP', function(remainingBanTime) {
                emitLog('Rejected incoming connection from ' + client.remoteAddress + '. The client is banned for ' + remainingBanTime + ' seconds');
            });
            client.on('forgaveBannedIP', function() {
                emitLog('Forgave banned IP ' + client.remoteAddress);
            });
            client.on('unknownStratumMethod', function(fullMessage) {
                emitLog('Unknown stratum method from ' + client.getLabel() + ': ' + fullMessage.method);
            });
            client.on('socketFlooded', function() {
                emitWarningLog('Detected socket flooding from ' + client.getLabel());
            });
            client.on('tcpProxyError', function(data) {
                emitErrorLog('Client IP detection failed, tcpProxyProtocol is enabled yet did not receive proxy protocol message, instead got data: ' + data);
            });
            client.on('triggerBan', function(reason) {
                emitWarningLog('Ban triggered for ' + client.getLabel() + ': ' + reason);
                _this.emit('banIP', client.remoteAddress, client.workerName);
            });

            // Indicate that Client Created Successfully
            _this.emit('connectionSucceeded');
        });
    };

    // Output Derived Pool Information
    /* istanbul ignore next */
    this.outputPoolInfo = function() {
        const startMessage = 'Stratum pool server started for ' + _this.options.coin.name +
            ' [' + _this.options.coin.symbol.toUpperCase() + '] {' + _this.options.coin.algorithm + '}';
        if (process.env.forkId && process.env.forkId !== '0') {
            emitLog(startMessage);
            return;
        }
        const infoLines = [startMessage,
            'Network Connected:\t' + (_this.options.testnet ? 'Testnet' : 'Mainnet'),
            'Current Block Height:\t' + _this.manager.currentJob.rpcData.height,
            'Current Connect Peers:\t' + _this.options.initStats.connections,
            'Current Block Diff:\t' + _this.manager.currentJob.difficulty * Algorithms[_this.options.coin.algorithm].multiplier,
            'Network Difficulty:\t' + _this.options.initStats.difficulty,
            'Stratum Port(s):\t' + _this.options.initStats.stratumPorts.join(', '),
            'Pool Fee Percentage:\t' + (_this.options.feePercentage * 100) + '%'
        ];
        if (typeof _this.options.blockRefreshInterval === 'number' && _this.options.blockRefreshInterval > 0) {
            infoLines.push('Block Polling Every:\t' + _this.options.blockRefreshInterval + ' ms');
        }
        emitSpecialLog(infoLines.join('\n\t\t\t\t\t\t'));
        _this.responseFn(true);
    };
};

module.exports = Pool;
Pool.prototype.__proto__ = events.EventEmitter.prototype;
