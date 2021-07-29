/*
 *
 * Pool (Updated)
 *
 */

const events = require('events');
const Algorithms = require('./algorithms');
const Difficulty = require('./difficulty');
const Daemon = require('./daemon');
const Manager = require('./manager');
const Network = require('./network');
const Peer = require('./peer');

////////////////////////////////////////////////////////////////////////////////

// Main Pool Function
const Pool = function(options, authorizeFn, responseFn) {

  const _this = this;
  this.options = options;
  this.authorizeFn = authorizeFn;
  this.responseFn = responseFn;

  const emitLog = (text) => _this.emit('log', 'debug', text);
  const emitWarningLog = (text) => _this.emit('log', 'warning', text);
  const emitSpecialLog = (text) => _this.emit('log', 'special', text);
  const emitErrorLog = (text) => {
    _this.emit('log', 'error', text);
    _this.responseFn(text);
  };

  // Validate Pool Algorithms
  /* istanbul ignore next */
  this.checkAlgorithm = function(algorithm) {
    if (!(algorithm in Algorithms)) {
      emitErrorLog('The ' + algorithm + ' algorithm is not supported.');
      throw new Error();
    }
  }

  // Check if Algorithms Supported
  _this.checkAlgorithm(_this.options.coin.algorithms.mining);
  _this.checkAlgorithm(_this.options.coin.algorithms.block);
  _this.checkAlgorithm(_this.options.coin.algorithms.coinbase);

  // Process Block when Found
  /* istanbul ignore next */
  this.processBlockNotify = function(blockHash) {
    const currentJob = _this.manager.currentJob;
    if ((typeof(currentJob) !== 'undefined') && (blockHash !== currentJob.rpcData.previousblockhash)) {
      _this.getBlockTemplate((error) => {
        if (error) {
          emitErrorLog('Block notify error getting block template for ' + _this.options.coin.name);
        } else {
          emitLog('Block template for ' + _this.options.coin.name + ' updated successfully');
        }
      });
    }
  };

  // Configure Port Difficulty
  /* istanbul ignore next */
  this.setDifficulty = function(port, difficultyConfig) {
    const currentPort = port.port;
    if (typeof(_this.difficulty[currentPort]) != 'undefined') {
      _this.difficulty[currentPort].removeAllListeners();
    }
    const difficultyInstance = new Difficulty(currentPort, difficultyConfig, false);
    _this.difficulty[currentPort] = difficultyInstance;
    _this.difficulty[currentPort].on('newDifficulty', (client, newDiff) => {
      client.enqueueNextDifficulty(newDiff);
    });
  };

  // Start Pool Capabilities
  /* istanbul ignore next */
  this.setupPool = function() {
    _this.setupDifficulty();
    _this.setupDaemonInterface(() => {
      _this.setupPoolData(() => {
        _this.setupRecipients();
        _this.setupJobManager();
        _this.setupBlockchain(() => {
          _this.setupFirstJob(() => {
            _this.setupBlockPolling();
            _this.setupPeer();
            _this.setupStratum(() => {
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
    _this.options.ports.forEach(port => {
      if (port.difficulty) {
        _this.setDifficulty(port, port.difficulty);
      }
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
    _this.daemon = new Daemon(_this.options.daemons, ((severity, message) => {
      _this.emit('log', severity , message);
    }));
    _this.daemon.once('online', () => {
      callback();
    });
    _this.daemon.on('connectionFailed', (error) => {
      emitErrorLog('Failed to connect daemon(s): ' + JSON.stringify(error));
    });
    _this.daemon.initDaemons(() => {});
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
    if (_this.options.coin.getInfo) {
      batchRPCCommand.push(['getinfo', []]);
    } else {
      batchRPCCommand.push(['getblockchaininfo', []], ['getnetworkinfo', []]);
    }

    // Manage RPC Batches
    _this.daemon.batchCmd(batchRPCCommand, (error, results) => {
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
      if (_this.options.coin.getInfo) {
        _this.options.settings.testnet = (rpcResults.getinfo.testnet === true) ? true : false;
      } else {
        _this.options.settings.testnet = (rpcResults.getblockchaininfo.chain === 'test') ? true : false;
      }

      // Establish Coin Protocol Version
      _this.options.address = rpcResults.validateaddress.address;
      _this.options.settings.protocolVersion = _this.options.coin.getInfo ? rpcResults.getinfo.protocolversion : rpcResults.getnetworkinfo.protocolversion;
      let difficulty = _this.options.coin.getInfo ? rpcResults.getinfo.difficulty : rpcResults.getblockchaininfo.difficulty;
      if (typeof(difficulty) == 'object') {
        difficulty = difficulty['proof-of-work'];
      }

      // Establish Coin Initial Statistics
      _this.options.statistics = {
        connections: (_this.options.coin.getInfo ? rpcResults.getinfo.connections : rpcResults.getnetworkinfo.connections),
        difficulty: difficulty * Algorithms[_this.options.coin.algorithms.mining].multiplier,
      };

      // Check if Pool is Able to Submit Blocks
      if (rpcResults.submitblock.message === 'Method not found') {
        _this.options.settings.hasSubmitMethod = false;
      } else if (rpcResults.submitblock.code === -1) {
        _this.options.settings.hasSubmitMethod = true;
      } else {
        emitErrorLog('Could not detect block submission RPC method');
        return;
      }

      callback();
    });
  };

  // Initialize Pool Recipients
  this.setupRecipients = function() {
    if (_this.options.recipients.length === 0) {
      emitErrorLog('No recipients have been added which means that no fees will be taken');
    }
    _this.options.settings.feePercentage = 0;
    _this.options.recipients.forEach(recipient => {
      _this.options.settings.feePercentage += recipient.percentage;
    });
  };

  // Submit Block to Stratum Server
  this.submitBlock = function(blockHex, callback) {

    // Check which Submit Method is Supported
    let rpcCommand, rpcArgs;
    if (_this.options.settings.hasSubmitMethod) {
      rpcCommand = 'submitblock';
      rpcArgs = [blockHex];
    } else {
      rpcCommand = 'getblocktemplate';
      rpcArgs = [{'mode': 'submit', 'data': blockHex}];
    }

    // Establish Submission Functionality
    _this.daemon.cmd(rpcCommand, rpcArgs, (results) => {
      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        if (result.error) {
          emitErrorLog('RPC error with daemon instance ' +
            result.instance.index + ' when submitting block with ' + rpcCommand + ' ' +
            JSON.stringify(result.error));
          return;
        } else if (result.response === 'rejected') {
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
    _this.daemon.cmd('getblock', [blockHash], (results) => {
      const validResults = results.filter((result) => {
        return result.response && (result.response.hash === blockHash);
      });
      if (validResults.length >= 1) {
        if (validResults[0].response.confirmations >= 0) {
          emitLog('Block was accepted by the network with ' + validResults[0].response.confirmations + ' confirmations');
          callback(true, validResults[0].response.tx[0]);
        } else {
          emitErrorLog('Block was rejected by the network');
          callback(false);
        }
      } else {
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
    _this.daemon.cmd('getblocktemplate', [callConfig], (result) => {
      if (result.error) {
        emitErrorLog('getblocktemplate call failed for daemon instance ' +
          result.instance.index + ' with error ' + JSON.stringify(result.error));
        callback(result.error);
      } else {
        const processedNewBlock = _this.manager.processTemplate(result.response, false);
        callback(null, result.response, processedNewBlock);
      }
    }, true);
  };

  // Initialize Pool Job Manager
  /* istanbul ignore next */
  this.setupJobManager = function() {

    // Establish Pool Manager
    _this.manager = new Manager(_this.options);
    _this.manager.on('newBlock', (blockTemplate) => {
      if (_this.stratum) {
        _this.stratum.broadcastMiningJobs(blockTemplate.getJobParams());
        if (_this.options.debug) {
          emitLog('Established new job for updated block template');
        }
      }
    });

    // Handle Share Submissions
    _this.manager.on('share', (shareData, blockHex) => {
      const shareValid = !shareData.error;
      let blockValid = !!blockHex;
      if (!blockValid)
        _this.emit('share', shareData, shareValid, blockValid, () => {});
      else {
        _this.submitBlock(blockHex, () => {
          _this.checkBlockAccepted(shareData.hash, (isAccepted, tx) => {
            blockValid = isAccepted;
            shareData.transaction = tx;
            _this.emit('share', shareData, shareValid, blockValid, () => {});
            _this.getBlockTemplate((error, result, foundNewBlock) => {
              if (foundNewBlock)
                emitLog('Block notification via RPC after block submission');
            });
          });
        });
      }
    });

    // Handle Block Submissions
    _this.manager.on('updatedBlock', (blockTemplate) => {
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
      const cmd = _this.options.coin.getInfo ? 'getinfo' : 'getblockchaininfo';
      _this.daemon.cmd(cmd, [], (results) => {
        const blockCount = Math.max.apply(null, results
          .flatMap(result => result.response)
          .flatMap(response => response.blocks));

        // Compare with Peers to Get Percentage Synced
        _this.daemon.cmd('getpeerinfo', [], (results) => {
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
      _this.daemon.cmd('getblocktemplate', [callConfig], (results) => {
        const synced = results.every((r) => {
          return !r.error || r.error.code !== -10;
        });
        if (synced) {
          callback();
        } else {
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
    checkSynced(() => {
      if (!process.env.forkId || process.env.forkId === '0') {
        emitErrorLog('Daemon is still syncing with the network. The server will be started once synced');
      }
    });
  };

  // Initialize First Pool Job
  /* istanbul ignore next */
  this.setupFirstJob = function(callback) {
    _this.getBlockTemplate((error) => {
      if (error) {
        emitErrorLog('Error with getblocktemplate on creating first job, server cannot start');
        return;
      }
      const portWarnings = [];
      const networkDiffAdjusted = _this.options.statistics.difficulty;
      _this.options.ports.forEach(port => {
        const currentPort = port.port;
        const portDiff = port.difficulty.initial;
        if (networkDiffAdjusted < portDiff) {
          portWarnings.push('port ' + currentPort + ' w/ diff ' + portDiff);
        }
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
    if (typeof _this.options.settings.blockRefreshInterval !== 'number' || _this.options.settings.blockRefreshInterval <= 0) {
      emitLog('Block template polling has been disabled');
      return;
    }
    let pollingFlag = false;
    const pollingInterval = _this.options.settings.blockRefreshInterval;
    setInterval(() => {
      if (pollingFlag === false) {
        pollingFlag = true;
        _this.getBlockTemplate((error, result, foundNewBlock) => {
          if (foundNewBlock) {
            emitLog('Block notification via RPC polling');
          }
          pollingFlag = false;
        });
      }
    }, pollingInterval);
  };

  // Initialize Pool Peers
  /* istanbul ignore next */
  this.setupPeer = function() {

    // Establish Peer Settings
    _this.options.settings.verack = false;
    _this.options.settings.validConnectionConfig = true;

    // Check for P2P Configuration
    if (!_this.options.p2p || !_this.options.p2p.enabled) {
      emitLog('p2p has been disabled in the configuration');
      return;
    }
    if (_this.options.settings.testnet && !_this.options.coin.testnet.peerMagic) {
      emitErrorLog('p2p cannot be enabled in testnet without peerMagic set in testnet configuration');
      return;
    } else if (!_this.options.coin.mainnet.peerMagic) {
      emitErrorLog('p2p cannot be enabled without peerMagic set in mainnet configuration');
      return;
    }

    // Establish Peer Server
    _this.peer = new Peer(_this.options);
    _this.peer.on('blockFound', (hash) => {
      emitLog('Block notification via p2p');
      _this.processBlockNotify(hash);
    });
    _this.peer.on('connectionFailed', () => {
      emitErrorLog('p2p connection failed - likely incorrect host or port');
    });
    _this.peer.on('connectionRejected', () => {
      emitErrorLog('p2p connection failed - likely incorrect p2p magic value');
    });
    _this.peer.on('error', (msg) => {
      emitErrorLog('p2p had an error: ' + msg);
    });
    _this.peer.on('socketError', (e) => {
      emitErrorLog('p2p had a socket error: ' + JSON.stringify(e));
    });
  };

  // Start Pool Stratum Server
  /* istanbul ignore next */
  this.setupStratum = function(callback) {

    // Establish Stratum Server
    _this.stratum = new Network(_this.options, _this.authorizeFn);
    _this.stratum.on('started', () => {
      const stratumPorts = _this.options.ports
        .filter(port => port.enabled)
        .flatMap(port => port.port);
      _this.options.statistics.stratumPorts = stratumPorts;
      _this.stratum.broadcastMiningJobs(_this.manager.currentJob.getJobParams());
      callback();
    });

    // Establish Timeout Functionality
    _this.stratum.on('broadcastTimeout', () => {
      if (_this.options.debug) {
        emitLog('No new blocks for ' + _this.options.settings.jobRebroadcastTimeout + ' seconds - updating transactions & rebroadcasting work');
      }
      _this.getBlockTemplate((error, rpcData, processedBlock) => {
        if (error || processedBlock) return;
        _this.manager.updateCurrentJob(rpcData);
        if (_this.options.debug) {
          emitLog('Updated existing job for current block template');
        }
      });
    });

    // Establish New Connection Functionality
    _this.stratum.on('client.connected', (client) => {
      if (typeof(_this.difficulty[client.socket.localPort]) !== 'undefined') {
        _this.difficulty[client.socket.localPort].manageClient(client);
      }

      client.on('difficultyChanged', (diff) => {
        _this.emit('difficultyUpdate', client.workerName, diff);
      });

      // Establish Client Subscription Functionality
      client.on('subscription', (params, callback) => {
        const extraNonce = _this.manager.extraNonceCounter.next();
        const extraNonce2Size = _this.manager.extraNonce2Size;
        callback(null, extraNonce, extraNonce2Size);
        const validPorts = _this.options.ports
          .filter(port => port.port === client.socket.localPort)
          .filter(port => typeof port.difficulty.initial !== undefined);
        if (validPorts.length >= 1) {
          client.sendDifficulty(validPorts[0].difficulty.initial);
        } else {
          client.sendDifficulty(8);
        }
        client.sendMiningJob(_this.manager.currentJob.getJobParams());
      });

      // Establish Client Submission Functionality
      client.on('submit', (message, callback) => {
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
      client.on('malformedMessage', (message) => {
        emitWarningLog('Malformed message from ' + client.getLabel() + ': ' + JSON.stringify(message));
      });
      client.on('socketError', (e) => {
        emitWarningLog('Socket error from ' + client.getLabel() + ': ' + JSON.stringify(e));
      });
      client.on('socketTimeout', (reason) => {
        emitWarningLog('Connection timed out for ' + client.getLabel() + ': ' + reason);
      });
      client.on('socketDisconnect', () => {
        emitWarningLog('Socket disconnect for ' + client.getLabel());
      });
      client.on('kickedBannedIP', (remainingBanTime) => {
        emitLog('Rejected incoming connection from ' + client.remoteAddress + '. The client is banned for ' + remainingBanTime + ' seconds');
      });
      client.on('forgaveBannedIP', () => {
        emitLog('Forgave banned IP ' + client.remoteAddress);
      });
      client.on('unknownStratumMethod', (fullMessage) => {
        emitLog('Unknown stratum method from ' + client.getLabel() + ': ' + fullMessage.method);
      });
      client.on('socketFlooded', () => {
        emitWarningLog('Detected socket flooding from ' + client.getLabel());
      });
      client.on('tcpProxyError', (data) => {
        emitErrorLog('Client IP detection failed, tcpProxyProtocol is enabled yet did not receive proxy protocol message, instead got data: ' + data);
      });
      client.on('triggerBan', (reason) => {
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
      ' [' + _this.options.coin.symbol.toUpperCase() + '] {' + _this.options.coin.algorithms.mining + '}';
    if (process.env.forkId && process.env.forkId !== '0') {
      emitLog(startMessage);
      return;
    }
    const infoLines = [startMessage,
      'Network Connected:\t' + (_this.options.settings.testnet ? 'Testnet' : 'Mainnet'),
      'Current Block Height:\t' + _this.manager.currentJob.rpcData.height,
      'Current Connect Peers:\t' + _this.options.statistics.connections,
      'Current Block Diff:\t' + _this.manager.currentJob.difficulty * Algorithms[_this.options.coin.algorithms.mining].multiplier,
      'Network Difficulty:\t' + _this.options.statistics.difficulty,
      'Stratum Port(s):\t' + _this.options.statistics.stratumPorts.join(', '),
      'Pool Fee Percentage:\t' + (_this.options.settings.feePercentage * 100) + '%'
    ];
    if (typeof _this.options.blockRefreshInterval === 'number' && _this.options.settings.blockRefreshInterval > 0) {
      infoLines.push('Block Polling Every:\t' + _this.options.settings.blockRefreshInterval + ' ms');
    }
    emitSpecialLog(infoLines.join('\n\t\t\t\t\t\t'));
    _this.responseFn(true);
  };
};

module.exports = Pool;
Pool.prototype.__proto__ = events.EventEmitter.prototype;
