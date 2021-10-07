/*
 *
 * Pool (Updated)
 *
 */

const bignum = require('bignum');
const events = require('events');
const utils = require('./utils');

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

  this.primary = {};
  this.auxiliary = {};

  const emitLog = (text) => _this.emit('log', 'debug', text);
  const emitWarningLog = (text) => _this.emit('log', 'warning', text);
  const emitSpecialLog = (text) => _this.emit('log', 'special', text);
  const emitErrorLog = (text) => {
    _this.emit('log', 'error', text);
    _this.responseFn(text);
  };

  // Ensure Logger Only Gets Called Once
  /* istanbul ignore next */
  const limitMessages = (callback) => {
    if (!process.env.forkId || process.env.forkId === '0') {
      callback();
    }
  };

  // Validate Pool Algorithms
  /* istanbul ignore next */
  this.checkAlgorithm = function(algorithm) {
    if (!(algorithm in Algorithms)) {
      emitErrorLog(`The ${ algorithm } algorithm is not supported.`);
      throw new Error(`The ${ algorithm } algorithm is not supported.`);
    }
  };

  // Check if Algorithms Supported
  _this.checkAlgorithm(_this.options.primary.coin.algorithms.mining);
  _this.checkAlgorithm(_this.options.primary.coin.algorithms.block);
  _this.checkAlgorithm(_this.options.primary.coin.algorithms.coinbase);

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

  // Initialize Specific Pool Daemons
  /* istanbul ignore next */
  this.setupDaemon = function(daemons, callback) {
    const daemon = new Daemon(daemons, ((severity, message) => {
      _this.emit('log', severity , message);
    }));
    daemon.once('online', () => callback());
    daemon.on('connectionFailed', (error) => {
      emitErrorLog(`Failed to connect daemon(s): ${ JSON.stringify(error) }`);
    });
    daemon.on('error', (message) => emitErrorLog(message));
    daemon.initDaemons(() => {});
    return daemon;
  };

  // Initialize Pool Daemon
  this.setupDaemonInterface = function(callback) {
    if (!Array.isArray(_this.options.primary.daemons) || _this.options.primary.daemons.length < 1) {
      emitErrorLog('No primary daemons have been configured - pool cannot start');
      return;
    }
    _this.primary.daemon = _this.setupDaemon(_this.options.primary.daemons, () => {});
    if (_this.options.auxiliary && _this.options.auxiliary.enabled) {
      if (!Array.isArray(_this.options.auxiliary.daemons) || _this.options.auxiliary.daemons.length < 1) {
        emitErrorLog('No auxiliary daemons have been configured - pool cannot start');
        return;
      }
      _this.auxiliary.daemon = _this.setupDaemon(_this.options.auxiliary.daemons, callback);
    } else {
      callback();
    }
  };

  // Initialize Pool Data
  /* istanbul ignore next */
  this.setupPoolData = function(callback) {
    const batchRPCCommand = [
      ['validateaddress', [_this.options.primary.address]],
      ['getmininginfo', []],
      ['submitblock', []]
    ];

    // Check if Coin has GetInfo Defined
    if (_this.options.primary.coin.getinfo) {
      batchRPCCommand.push(['getinfo', []]);
    } else {
      batchRPCCommand.push(['getblockchaininfo', []], ['getnetworkinfo', []]);
    }

    // Manage RPC Batches
    _this.primary.daemon.batchCmd(batchRPCCommand, (error, results) => {
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
          emitErrorLog(`Could not start pool, error with init RPC call: ${ rpcCall } - ${ JSON.stringify(output.error)}`);
          return;
        }
      });

      // Check Pool Address is Valid
      if (!rpcResults.validateaddress.isvalid) {
        emitErrorLog('Daemon reports address is not valid');
        return;
      }

      // Check if Address is Owned by Wallet (PoS Only)
      if (_this.options.primary.coin.staking && typeof rpcResults.validateaddress.pubkey === 'undefined') {
        emitErrorLog('The address provided is not from the daemon wallet - this is required for PoS coins.');
        return;
      }

      // Store Derived PubKey if Necessary (PoS Only)
      if (_this.options.primary.coin.staking) {
        _this.options.primary.pubkey = rpcResults.validateaddress.pubkey;
      }

      // Check if Mainnet/Testnet is Active
      if (_this.options.primary.coin.getinfo) {
        _this.options.settings.testnet = (rpcResults.getinfo.testnet === true) ? true : false;
      } else {
        _this.options.settings.testnet = (rpcResults.getblockchaininfo.chain === 'test') ? true : false;
      }

      // Establish Coin Protocol Version
      _this.options.primary.address = rpcResults.validateaddress.address;
      _this.options.settings.protocolVersion = _this.options.primary.coin.getinfo ? rpcResults.getinfo.protocolversion : rpcResults.getnetworkinfo.protocolversion;
      let difficulty = _this.options.primary.coin.getinfo ? rpcResults.getinfo.difficulty : rpcResults.getblockchaininfo.difficulty;
      if (typeof(difficulty) == 'object') {
        difficulty = difficulty['proof-of-work'];
      }

      // Establish Coin Initial Statistics
      _this.options.statistics = {
        connections: _this.options.primary.coin.getinfo ? rpcResults.getinfo.connections : rpcResults.getnetworkinfo.connections,
        difficulty: difficulty * Algorithms[_this.options.primary.coin.algorithms.mining].multiplier,
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
    if (_this.options.primary.recipients.length === 0) {
      emitWarningLog('No recipients have been added which means that no fees will be taken');
    }
    _this.options.settings.feePercentage = 0;
    _this.options.primary.recipients.forEach(recipient => {
      _this.options.settings.feePercentage += recipient.percentage;
    });
  };

  // Submit Primary Block to Stratum Server
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
    _this.primary.daemon.cmd(rpcCommand, rpcArgs, (results) => {
      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        if (result.error) {
          emitErrorLog('RPC error with primary daemon instance ' +
            result.instance.index + ' when submitting block with ' + rpcCommand + ' ' +
            JSON.stringify(result.error));
          return;
        } else if (result.response === 'rejected') {
          emitErrorLog(`Primary daemon instance ${ result.instance.index } rejected a supposedly valid block`);
          return;
        }
      }
      emitSpecialLog(`Submitted primary block successfully to ${ _this.options.primary.coin.name }'s daemon instance(s)`);
      callback();
    });
  };

  // Submit Auxiliary Block to Stratum Server
  /* istanbul ignore next */
  this.submitAuxBlock = function(headerBuffer, coinbaseBuffer, blockHash, callback) {

    // Build Branch Proof from Block Hash
    const branch = utils.uint256BufferFromHash(_this.auxiliary.rpcData.hash);
    let branchProof = _this.manager.auxMerkle.getHashProof(branch);
    if (!branchProof) {
      branchProof = Buffer.concat([utils.varIntBuffer(0), utils.packInt32LE(0)]);
    }

    // Build Coinbase Proof from Current Job Data
    const coinbaseProof = Buffer.concat([
      utils.varIntBuffer(_this.manager.currentJob.merkle.steps.length),
      Buffer.concat(_this.manager.currentJob.merkle.steps),
      utils.packInt32LE(0)
    ]);

    // Build AuxPoW Block to Submit to Auxiliary Daemon
    const auxPow = Buffer.concat([
      coinbaseBuffer,
      blockHash,
      coinbaseProof,
      branchProof,
      headerBuffer
    ]);

    // Submit AuxPow Block to Auxiliary Daemon
    const rpcArgs = [_this.auxiliary.rpcData.hash, auxPow.toString('hex')];
    _this.auxiliary.daemon.cmd('getauxblock', rpcArgs, (results) => {
      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        if (result.error) {
          emitErrorLog('RPC error with auxiliary daemon instance ' +
            result.instance.index + ' when submitting block with getauxblock ' +
            JSON.stringify(result.error));
          return;
        } else if (!result.response || result.response === 'rejected') {
          emitErrorLog(`Auxiliary daemon instance ${ result.instance.index } rejected a supposedly valid block`);
          return;
        }
      }
      emitSpecialLog(`Submitted auxiliary block successfully to ${ _this.options.auxiliary.coin.name }'s daemon instance(s)`);
      callback(_this.auxiliary.rpcData.hash);
    });
  };

  // Check Whether Block was Accepted by Daemon
  this.checkBlockAccepted = function(blockHash, daemon, callback) {
    daemon.cmd('getblock', [blockHash], (results) => {
      const validResults = results.filter((result) => {
        return result.response && (result.response.hash === blockHash);
      });
      if (validResults.length >= 1) {
        if (validResults[0].response.confirmations >= 0) {
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
  this.getBlockTemplate = function(callback, force) {
    const callConfig = {
      'capabilities': [
        'coinbasetxn',
        'workid',
        'coinbase/append'
      ]
    };
    if (_this.options.primary.coin.segwit) {
      callConfig.rules = ['segwit'];
    }

    // Handle Block Templates/Subsidy
    _this.primary.daemon.cmd('getblocktemplate', [callConfig], (result) => {
      if (result.error) {
        emitErrorLog('getblocktemplate call failed for daemon instance ' +
          result.instance.index + ' with error ' + JSON.stringify(result.error));
        callback(result.error);
      } else {
        if (_this.options.auxiliary && _this.options.auxiliary.enabled) {
          result.response.auxData = _this.auxiliary.rpcData;
        }
        const processedNewBlock = _this.manager.processTemplate(result.response, force);
        callback(null, result.response, processedNewBlock);
      }
    }, true);
  };

  // Update Work for Auxiliary Chain
  /* istanbul ignore next */
  this.getAuxTemplate = function(callback) {
    if (_this.options.auxiliary && _this.options.auxiliary.enabled) {
      _this.auxiliary.daemon.cmd('getauxblock', [], (result) => {
        if (result[0].error) {
          emitErrorLog('getauxblock call failed for daemon instance ' +
            result[0].instance.index + ' with error ' + JSON.stringify(result[0].error));
          callback(result[0].error);
        } else {
          let updateTemplate = false;
          const hash = result[0].response.target || result[0].response._target || '';
          const target = utils.uint256BufferFromHash(hash, {endian: 'little', size: 32});
          if (_this.auxiliary.rpcData) {
            if (_this.auxiliary.rpcData.hash != result[0].response.hash) {
              updateTemplate = true;
            }
          }
          _this.auxiliary.rpcData = result[0].response;
          _this.auxiliary.rpcData.target = bignum.fromBuffer(target);
          callback(null, result[0].response, updateTemplate);
        }
      });
    } else {
      callback(null, null, false);
    }
  };

  // Initialize Pool Job Manager
  /* istanbul ignore next */
  this.setupJobManager = function() {

    // Establish Pool Manager
    _this.manager = new Manager(_this.options);
    _this.manager.on('newBlock', (blockTemplate) => {
      if (_this.stratum) {
        _this.stratum.broadcastMiningJobs(blockTemplate, true);
        if (_this.options.debug) {
          emitLog('Established new job for updated block template');
        }
      }
    });

    // Handle Share Submissions
    _this.manager.on('share', (shareData, auxShareData, blockValid) => {
      const shareValid = !shareData.error;

      // Process Share/Primary Submission
      if (!blockValid) {
        _this.emit('share', shareData, shareValid, blockValid, () => {});
      } else {
        _this.submitBlock(shareData.hex, () => {
          _this.checkBlockAccepted(shareData.hash, _this.primary.daemon, (accepted, tx) => {
            shareData.transaction = tx;
            _this.emit('share', shareData, shareValid, accepted, () => {});
            _this.getBlockTemplate((error, result, foundNewBlock) => {
              if (foundNewBlock) {
                emitSpecialLog('Block notification via RPC after primary block submission');
              }
            }, false);
          });
        });
      }

      // Process Auxiliary Block Submission
      if (shareValid && _this.options.auxiliary && _this.options.auxiliary.enabled) {

        // Calculate Auxiliary Difficulty
        const algorithm = _this.options.primary.coin.algorithms.mining;
        const shareMultiplier = Algorithms[algorithm].multiplier;
        const difficulty = parseFloat((Algorithms[algorithm].diff / _this.auxiliary.rpcData.target.toNumber()).toFixed(9));
        auxShareData.blockDiffAuxiliary = difficulty * shareMultiplier;

        // Check if Share is Valid Block Candidate
        if (_this.auxiliary.rpcData.target.ge(auxShareData.headerDiff)) {
          const hexBuffer = Buffer.from(auxShareData.hex, 'hex').slice(0, 80);
          _this.submitAuxBlock(hexBuffer, auxShareData.coinbase, auxShareData.header, (hash) => {
            _this.checkBlockAccepted(hash, _this.auxiliary.daemon, (accepted, tx) => {
              auxShareData.transaction = tx;
              auxShareData.height = _this.auxiliary.rpcData.height;
              auxShareData.reward = _this.auxiliary.rpcData.coinbasevalue;
              _this.emit('share', auxShareData, shareValid, accepted, () => {});
              _this.getBlockTemplate((error, result, foundNewBlock) => {
                if (foundNewBlock) {
                  emitSpecialLog('Block notification via RPC after auxiliary block submission');
                }
              }, true);
            });
          });
        }
      }
    });

    // Handle Updated Block Data
    _this.manager.on('updatedBlock', (blockTemplate) => {
      if (_this.stratum) {
        _this.stratum.broadcastMiningJobs(blockTemplate, false);
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
    if (_this.options.primary.coin.segwit) {
      callConfig.rules = ['segwit'];
    }

    // Calculate Current Progress on Sync
    const generateProgress = function() {
      const cmd = _this.options.primary.coin.getinfo ? 'getinfo' : 'getblockchaininfo';
      _this.primary.daemon.cmd(cmd, [], (results) => {
        const blockCount = Math.max.apply(null, results
          .flatMap(result => result.response)
          .flatMap(response => response.blocks));

        // Compare with Peers to Get Percentage Synced
        _this.primary.daemon.cmd('getpeerinfo', [], (results) => {
          const peers = results[0].response;
          const totalBlocks = Math.max.apply(null, peers
            .flatMap(response => response.startingheight));
          const percent = (blockCount / totalBlocks * 100).toFixed(2);
          emitWarningLog(`Downloaded ${ percent }% of blockchain from ${ peers.length } peers`);
        });
      });
    };

    // Check for Blockchain to be Fully Synced
    const checkSynced = function(displayNotSynced) {
      _this.primary.daemon.cmd('getblocktemplate', [callConfig], (results) => {
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
          limitMessages(() => generateProgress());
        }
      });
    };

    // Check and Return Message if Not Synced
    checkSynced(() => {
      limitMessages(() => {
        emitErrorLog('Daemon is still syncing with the network. The server will be started once synced');
      });
    });
  };

  // Initialize First Pool Job
  /* istanbul ignore next */
  this.setupFirstJob = function(callback) {
    _this.getAuxTemplate(() => {
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
            portWarnings.push(`port ${ currentPort } w/ diff ${ portDiff}`);
          }
        });
        if (portWarnings.length > 0) {
          limitMessages(() => {
            emitWarningLog(`Network diff of ${ networkDiffAdjusted } is lower than ${ portWarnings.join(' and ') }`);
          });
        }
        callback();
      }, false);
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
        _this.getAuxTemplate((auxililaryError, auxiliaryResult, auxiliaryUpdate) => {
          _this.getBlockTemplate((primaryError, primaryResult, primaryUpdate) => {
            pollingFlag = false;
            if (primaryUpdate && !auxiliaryUpdate) {
              limitMessages(() => {
                emitLog(`Primary chain (${ _this.options.primary.coin.name }) notification via RPC polling at height ${ primaryResult.height }`);
              });
            }
            if (auxiliaryUpdate) {
              limitMessages(() => {
                emitLog(`Auxiliary chain (${ _this.options.auxiliary.coin.name }) notification via RPC polling at height ${ auxiliaryResult.height }`);
              });
            }
          }, auxiliaryUpdate);
        });
      }
    }, pollingInterval);
  };

  // Process Block when Found
  /* istanbul ignore next */
  this.processBlockNotify = function(blockHash) {
    const currentJob = _this.manager.currentJob;
    if ((typeof(currentJob) !== 'undefined') && (blockHash !== currentJob.rpcData.previousblockhash)) {
      _this.getBlockTemplate((error) => {
        if (error) {
          emitErrorLog(`Block notify error getting block template for ${ _this.options.primary.coin.name }`);
        } else {
          emitLog(`Block template for ${ _this.options.primary.coin.name } updated successfully`);
        }
      }, false);
    }
  };

  // Initialize Pool Peers
  /* istanbul ignore next */
  this.setupPeer = function() {

    // Establish Peer Settings
    _this.options.settings.verack = false;
    _this.options.settings.validConnectionConfig = true;

    // Check for P2P Configuration
    if (!_this.options.p2p || !_this.options.p2p.enabled) {
      limitMessages(() => {
        emitLog('p2p has been disabled in the configuration');
      });
      return;
    }
    if (_this.options.settings.testnet && !_this.options.primary.coin.testnet.peerMagic) {
      emitErrorLog('p2p cannot be enabled in testnet without peerMagic set in testnet configuration');
      return;
    } else if (!_this.options.primary.coin.mainnet.peerMagic) {
      emitErrorLog('p2p cannot be enabled without peerMagic set in mainnet configuration');
      return;
    }

    // Establish Peer Server
    _this.peer = new Peer(_this.options);
    _this.peer.on('blockFound', (hash) => {
      emitLog('Block notification via p2p', false);
      _this.processBlockNotify(hash);
    });
    _this.peer.on('connectionFailed', () => {
      emitErrorLog('p2p connection failed - likely incorrect host or port');
    });
    _this.peer.on('connectionRejected', () => {
      emitErrorLog('p2p connection failed - likely incorrect p2p magic value');
    });
    _this.peer.on('error', (msg) => {
      emitErrorLog(`p2p had an error: ${ msg }`);
    });
    _this.peer.on('socketError', (e) => {
      emitErrorLog(`p2p had a socket error: ${ JSON.stringify(e) }`);
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
      _this.stratum.broadcastMiningJobs(_this.manager.currentJob, true);
      callback();
    });

    // Establish Timeout Functionality
    _this.stratum.on('broadcastTimeout', () => {
      if (_this.options.debug) {
        emitLog(`No new blocks for ${ _this.options.settings.jobRebroadcastTimeout } seconds - updating transactions & rebroadcasting work`);
      }
      _this.getBlockTemplate((error, rpcData, processedBlock) => {
        if (error || processedBlock) return;
        _this.manager.updateCurrentJob(rpcData);
        if (_this.options.debug) {
          emitLog('Updated existing job for current block template');
        }
      }, false);
    });

    // Establish New Connection Functionality
    _this.stratum.on('client.connected', (client) => {
      if (typeof(_this.difficulty[client.socket.localPort]) !== 'undefined') {
        _this.difficulty[client.socket.localPort].manageClient(client);
      }

      client.on('difficultyChanged', (diff) => {
        _this.emit('difficultyUpdate', client.addrPrimary, diff);
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
        client.sendMiningJob(_this.manager.currentJob.getJobParams(client, true));
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
          client.addrPrimary,
          client.addrAuxiliary,
          message.params[5],
          client.versionMask,
          client.asicboost,
        );
        callback(result.error, result.result ? true : null);
      });

      // Establish Miscellaneous Client Functionality
      client.on('malformedMessage', (message) => {
        emitWarningLog(`Malformed message from ${ client.getLabel() }: ${ JSON.stringify(message) }`);
      });
      client.on('socketError', (e) => {
        emitWarningLog(`Socket error from ${ client.getLabel() }: ${ JSON.stringify(e) }`);
      });
      client.on('socketTimeout', (reason) => {
        emitWarningLog(`Connection timed out for ${ client.getLabel() }: ${ reason }`);
      });
      client.on('socketDisconnect', () => {
        emitWarningLog(`Socket disconnect for ${ client.getLabel() }`);
      });
      client.on('kickedBannedIP', (remainingBanTime) => {
        emitLog(`Rejected incoming connection from ${ client.remoteAddress }. The client is banned for ${ remainingBanTime } seconds.`);
      });
      client.on('forgaveBannedIP', () => {
        emitLog(`Forgave banned IP ${ client.remoteAddress }`);
      });
      client.on('unknownStratumMethod', (fullMessage) => {
        emitLog(`Unknown stratum method from ${ client.getLabel() }: ${ fullMessage.method }`);
      });
      client.on('socketFlooded', () => {
        emitWarningLog(`Detected socket flooding from ${ client.getLabel() }`);
      });
      client.on('tcpProxyError', (data) => {
        emitErrorLog(`Client IP detection failed, tcpProxyProtocol is enabled yet did not receive proxy protocol message, instead got data: ${ data }`);
      });
      client.on('triggerBan', (reason) => {
        emitWarningLog(`Ban triggered for ${ client.getLabel() }: ${ reason }`);
        _this.emit('banIP', client.remoteAddress, client.addrPrimary);
      });

      // Indicate that Client Created Successfully
      _this.emit('connectionSucceeded');
    });
  };

  // Output Derived Pool Information
  /* istanbul ignore next */
  this.outputPoolInfo = function() {
    const startMessage = `Stratum pool server started for ${ _this.options.name }`;
    const infoLines = [startMessage,
      `Coins Connected:\t${ _this.options.coins }`,
      `Network Connected:\t${ _this.options.settings.testnet ? 'Testnet' : 'Mainnet' }`,
      `Current Block Height:\t${ _this.manager.currentJob.rpcData.height }`,
      `Current Connect Peers:\t${ _this.options.statistics.connections }`,
      `Current Block Diff:\t${ _this.manager.currentJob.difficulty * Algorithms[_this.options.primary.coin.algorithms.mining].multiplier }`,
      `Network Difficulty:\t${ _this.options.statistics.difficulty }`,
      `Stratum Port(s):\t${ _this.options.statistics.stratumPorts.join(', ') }`,
      `Pool Fee Percentage:\t${ _this.options.settings.feePercentage * 100 }%`,
    ];
    if (typeof _this.options.settings.blockRefreshInterval === 'number' && _this.options.settings.blockRefreshInterval > 0) {
      infoLines.push(`Block Polling Every:\t${ _this.options.settings.blockRefreshInterval } ms`);
    }
    limitMessages(() => {
      emitSpecialLog(infoLines.join('\n\t\t\t\t\t\t'));
    });
    _this.responseFn(true);
  };
};

module.exports = Pool;
Pool.prototype.__proto__ = events.EventEmitter.prototype;
