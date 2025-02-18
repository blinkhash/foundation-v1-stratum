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
const zmq = require('zeromq');

////////////////////////////////////////////////////////////////////////////////

// Main Pool Function
const Pool = function(poolConfig, portalConfig, authorizeFn, responseFn) {

  const _this = this;
  this.poolConfig = poolConfig;
  this.portalConfig = portalConfig;
  this.authorizeFn = authorizeFn;
  this.responseFn = responseFn;

  this.primary = {
    zmq: { enabled: _this.poolConfig.primary.zmq && _this.poolConfig.primary.zmq.enabled }
  };
  this.auxiliary = {
    enabled: _this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled,
    zmq: { enabled: _this.poolConfig.auxiliary && _this.poolConfig.auxiliary.zmq &&
      _this.poolConfig.auxiliary.zmq.enabled }
  };

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
  _this.checkAlgorithm(_this.poolConfig.primary.coin.algorithms.mining);
  _this.checkAlgorithm(_this.poolConfig.primary.coin.algorithms.block);
  _this.checkAlgorithm(_this.poolConfig.primary.coin.algorithms.coinbase);

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
            _this.setupBlockPolling(() => {;
              _this.setupPeer();
              _this.setupStratum(() => {
                _this.outputPoolInfo();
                _this.emit('started');
              });
            });
          });
        });
      });
    });
  };

  // Configure Port Difficulty
  /* istanbul ignore next */
  this.setDifficulty = function(port) {
    const currentPort = port.port;
    const currentDifficulty = port.difficulty;
    if (typeof(_this.difficulty[currentPort]) != 'undefined') {
      _this.difficulty[currentPort].removeAllListeners();
    }
    const difficultyInstance = new Difficulty(currentPort, currentDifficulty, false);
    _this.difficulty[currentPort] = difficultyInstance;
    _this.difficulty[currentPort].on('newDifficulty', (client, newDiff) => {
      client.enqueueNextDifficulty(newDiff);
    });
  };

  // Initialize Pool Difficulty
  /* istanbul ignore next */
  this.setupDifficulty = function() {
    _this.difficulty = {};
    _this.poolConfig.ports.forEach(port => {
      if (port.difficulty) {
        _this.setDifficulty(port);
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
    if (!Array.isArray(_this.poolConfig.primary.daemons) || _this.poolConfig.primary.daemons.length < 1) {
      emitErrorLog('No primary daemons have been configured - pool cannot start');
      return;
    }
    _this.primary.daemon = _this.setupDaemon(_this.poolConfig.primary.daemons, () => {});
    if (_this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {
      if (!Array.isArray(_this.poolConfig.auxiliary.daemons) || _this.poolConfig.auxiliary.daemons.length < 1) {
        emitErrorLog('No auxiliary daemons have been configured - pool cannot start');
        return;
      }
      _this.auxiliary.daemon = _this.setupDaemon(_this.poolConfig.auxiliary.daemons, callback);
    } else {
      callback();
    }
  };

  // Initialize Pool Data
  /* istanbul ignore next */
  this.setupPoolData = function(callback) {
    const batchRPCCommand = [
      ['validateaddress', [_this.poolConfig.primary.address]],
      ['getmininginfo', []],
      ['submitblock', []]
    ];

    // Check if Coin has GetInfo Defined
    if (_this.poolConfig.primary.coin.getinfo) {
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

      // Check if Mainnet/Testnet is Active
      if (_this.poolConfig.primary.coin.getinfo) {
        _this.poolConfig.settings.testnet = (rpcResults.getinfo.testnet === true) ? true : false;
      } else {
        _this.poolConfig.settings.testnet = (rpcResults.getblockchaininfo.chain === 'test') ? true : false;
      }

      // Establish Coin Protocol Version
      _this.poolConfig.primary.address = rpcResults.validateaddress.address;
      _this.poolConfig.settings.protocolVersion = _this.poolConfig.primary.coin.getinfo ? rpcResults.getinfo.protocolversion : rpcResults.getnetworkinfo.protocolversion;
      let difficulty = _this.poolConfig.primary.coin.getinfo ? rpcResults.getinfo.difficulty : rpcResults.getblockchaininfo.difficulty;
      if (typeof(difficulty) == 'object') {
        difficulty = difficulty['proof-of-work'];
      }

      // Establish Coin Initial Statistics
      _this.poolConfig.statistics = {
        connections: _this.poolConfig.primary.coin.getinfo ? rpcResults.getinfo.connections : rpcResults.getnetworkinfo.connections,
        difficulty: difficulty * Algorithms[_this.poolConfig.primary.coin.algorithms.mining].multiplier,
      };

      // Check if Pool is Able to Submit Blocks
      if (rpcResults.submitblock.message === 'Method not found') {
        _this.poolConfig.settings.hasSubmitMethod = false;
      } else if (rpcResults.submitblock.code === -1) {
        _this.poolConfig.settings.hasSubmitMethod = true;
      } else {
        emitErrorLog('Could not detect block submission RPC method');
        return;
      }

      callback();
    });
  };

  // Initialize Pool Recipients
  this.setupRecipients = function() {
    if (_this.poolConfig.primary.recipients.length === 0) {
      emitWarningLog('No recipients have been added which means that no fees will be taken');
    }
    _this.poolConfig.settings.feePercentage = 0;
    _this.poolConfig.primary.recipients.forEach(recipient => {
      _this.poolConfig.settings.feePercentage += recipient.percentage;
    });
  };

  // Submit Primary Block to Stratum Server
  this.submitBlock = function(blockHex, callback) {

    // Check which Submit Method is Supported
    let rpcCommand, rpcArgs;
    if (_this.poolConfig.settings.hasSubmitMethod) {
      rpcCommand = 'submitblock';
      rpcArgs = [blockHex];
    } else {
      rpcCommand = 'getblocktemplate';
      rpcArgs = [{'mode': 'submit', 'data': blockHex}];
    }

    // Establish Submission Functionality
    _this.primary.daemon.cmd(rpcCommand, rpcArgs, false, (results) => {
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
      emitSpecialLog(`Submitted primary block successfully to ${ _this.poolConfig.primary.coin.name }'s daemon instance(s)`);
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
    _this.auxiliary.daemon.cmd('getauxblock', rpcArgs, false, (results) => {
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
      emitSpecialLog(`Submitted auxiliary block successfully to ${ _this.poolConfig.auxiliary.coin.name }'s daemon instance(s)`);
      callback(_this.auxiliary.rpcData.hash);
    });
  };

  // Check Whether Block was Accepted by Daemon
  this.checkBlockAccepted = function(blockHash, daemon, callback) {
    daemon.cmd('getblock', [blockHash], false, (results) => {
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

  // Check for New Primary Block Template
  this.checkPrimaryTemplate = function(auxUpdate, callback) {

    // Build Daemon Commands
    const commands = [['getblockchaininfo', []]];

    // Check Saved Blockchain Data
    _this.primary.daemon.cmd(commands, [], true, (result) => {
      if (result.error) {
        emitLog(`RPC error with primary daemon instance (${ result.instance.host }) when requesting a primary template update: ${ JSON.stringify(result.error) }`);
        callback(result.error);
      } else if (!_this.primary.height || !_this.primary.previousblockhash) {
        _this.primary.height = result.response.blocks;
        _this.primary.previousblockhash = result.response.bestblockhash;
        callback(null, true);
      } else if ((_this.primary.height !== result.response.blocks) || (_this.primary.previousblockhash !== result.response.bestblockhash)) {
        _this.primary.height = result.response.blocks;
        _this.primary.previousblockhash = result.response.bestblockhash;
        callback(null, true);
      } else if (auxUpdate) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  };

  // Setup Primary Block Pooling
  this.handlePrimaryBlockPolling = function() {

    // Build Initial Variables
    let pollingFlag = false;
    const pollingInterval = _this.poolConfig.settings.blockRefreshInterval;

    // Handle Polling Interval
    setInterval(() => {
      if (pollingFlag === false) {
        pollingFlag = true;
        _this.checkPrimaryTemplate(false, (error, update) => {
          if (!error && update) {
            _this.getBlockTemplate((error, result, update) => {              
              pollingFlag = false;
              if (update) emitLog(`Requested template from primary chain (${ _this.poolConfig.primary.coin.name }:${ result.height }) via RPC polling`);
            });
          } else {
            pollingFlag = false;
          }
        });
      }
    }, pollingInterval);
  };

  // Setup Primary Block ZMQ
  this.handlePrimaryBlockZmq = function(callback) {

    // Build Initial Variables
    const sock = zmq.socket('sub');
    const zmqConfig = _this.poolConfig.primary.zmq;

    // Check if ZMQ Connection Can Be Made
    utils.checkConnection(zmqConfig.host, zmqConfig.port).then(() => {
      sock.connect(`tcp://${ zmqConfig.host }:${ zmqConfig.port }`);
      sock.subscribe('hashblock');

      // Handle Block Notifications
      sock.on('message', () => {
        _this.getBlockTemplate((error, result, update) => {
          if (update) emitLog(`Requested template from primary chain (${ _this.poolConfig.primary.coin.name }:${ result.height }) via ZMQ subscription`);
        });
      });

      // Handle Reconnects as Necessary
      setInterval(() => {
        sock.connect(`tcp://${ zmqConfig.host }:${ zmqConfig.port }`);
        sock.subscribe('hashblock');
      }, _this.poolConfig.settings.blockRefreshInterval * 10);

      // Handle Callback
      callback();

    // ZMQ Connection Threw an Error
    }, (error) => {
      _this.emitLog('error', false, _this.text.stratumZmqText1(JSON.stringify(error)));
      callback(error);
    });
  };

  // Load Current Block Template
  this.getBlockTemplate = function(callback, force) {
    const callConfig = {
      'capabilities': [
        'coinbasetxn',
        'workid',
        'coinbase/append'
      ],
      'rules': [],
    };
    if (_this.poolConfig.primary.coin.segwit) callConfig.rules.push('segwit');
    if (_this.poolConfig.primary.coin.mweb) callConfig.rules.push('mweb');

    // Handle Block Templates/Subsidy
    _this.primary.daemon.cmd('getblocktemplate', [callConfig], true, (result) => {
      if (result.error) {
        emitErrorLog('getblocktemplate call failed for daemon instance ' +
          result.instance.index + ' with error ' + JSON.stringify(result.error));
        callback(result.error);
      } else {
        if (_this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {
          result.response.auxData = _this.auxiliary.rpcData;
        }
        const processedNewBlock = _this.manager.processTemplate(result.response, force);
        callback(null, result.response, processedNewBlock);
      }
    });
  };

  // Setup Auxiliary Block Pooling
  this.handleAuxiliaryBlockPolling = function() {

    // Build Initial Variables
    let pollingFlag = false;
    const pollingInterval = _this.poolConfig.settings.blockRefreshInterval;

    // Handle Polling Interval
    setInterval(() => {
      if (pollingFlag === false) {
        pollingFlag = true;
        _this.checkAuxiliaryTemplate((auxError) => {
          if (!auxError) {
            _this.getAuxTemplate((auxError, auxResult, auxUpdate) => {              
              _this.checkPrimaryTemplate(auxUpdate, (error, update) => {
                if (auxUpdate) emitLog(`Requested template from auxiliary chain (${ _this.poolConfig.auxiliary.coin.name }:${ auxResult.height }) via RPC polling`);
                if (!error && update) {
                  _this.getBlockTemplate(auxUpdate, false, (error, result, update) => {
                    pollingFlag = false;
                    if (update) emitLog(`Requested template from primary chain (${ _this.poolConfig.primary.coin.name }:${ result.height }) via RPC polling`);
                  });
                } else {
                  pollingFlag = false;
                }
              });
            });
          }
        });
      }
    }, pollingInterval);
  };

  // Setup Auxiliary Block ZMQ
  this.handleAuxiliaryBlockZmq = function(callback) {

    // Build Initial Variables
    const sock = zmq.socket('sub');
    const zmqConfig = _this.poolConfig.auxiliary.zmq;

    // Check if ZMQ Connection Can Be Made
    utils.checkConnection(zmqConfig.host, zmqConfig.port).then(() => {
      sock.connect(`tcp://${ zmqConfig.host }:${ zmqConfig.port }`);
      sock.subscribe('hashblock');

      // Handle Block Notifications
      sock.on('message', () => {
        _this.getAuxTemplate((auxError, auxResult, auxUpdate) => {
          if (auxUpdate) emitLog(`Requested template from auxiliary chain (${ _this.poolConfig.auxiliary.coin.name }:${ auxResult.height }) via ZMQ subscription`);
          _this.getBlockTemplate(auxUpdate, false, (error, result, update) => {
            if (update) emitLog(`Requested template from primary chain (${ _this.poolConfig.primary.coin.name }:${ result.height }) via ZMQ subscription`);
          });
        });
      });

      // Handle Reconnects as Necessary
      setInterval(() => {
        sock.connect(`tcp://${ zmqConfig.host }:${ zmqConfig.port }`);
        sock.subscribe('hashblock');
      }, _this.poolConfig.settings.blockRefreshInterval * 10);

      // Handle Callback
      callback();

    // ZMQ Connection Threw an Error
    }, (error) => {
      _this.emitLog('error', false, _this.text.stratumZmqText2(JSON.stringify(error)));
      callback(error);
    });
  };

  // Check for New Auxiliary Block Template
  this.checkAuxiliaryTemplate = function(callback) {

    // Build Daemon Commands
    const commands = [['getblockchaininfo', []]];

    // Check Saved Blockchain Data
    if (_this.auxiliary.enabled) {
      _this.auxiliary.daemon.cmd(commands, true, (result) => {
        if (result.error) {
          emitLog(`RPC error with auxiliary daemon instance (${ result.instance.host }) when requesting an auxiliary template update: ${ JSON.stringify(result.error) }`);
          callback(result.error);
        } else if (!_this.auxiliary.height || !_this.auxiliary.previousblockhash) {
          _this.auxiliary.height = result.response.blocks;
          _this.auxiliary.previousblockhash = result.response.bestblockhash;
          callback(null, true);
        } else if ((_this.auxiliary.height !== result.response.blocks) || (_this.auxiliary.previousblockhash !== result.response.bestblockhash)) {
          _this.auxiliary.height = result.response.blocks;
          _this.auxiliary.previousblockhash = result.response.bestblockhash;
          callback(null, true);
        } else {
          callback(null, false);
        }
      });
    } else {
      callback(null, false);
    }
  };


  // Update Work for Auxiliary Chain
  /* istanbul ignore next */
  this.getAuxTemplate = function(callback) {
    if (_this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {
      _this.auxiliary.daemon.cmd('getauxblock', [], true, (result) => {
        if (result.error) {
          emitErrorLog('getauxblock call failed for daemon instance ' +
            result.instance.index + ' with error ' + JSON.stringify(result.error));
          callback(result.error);
        } else {
          let updateTemplate = false;
          const hash = result.response.target || result.response._target || '';
          const target = utils.uint256BufferFromHash(hash, {endian: 'little', size: 32});
          if (_this.auxiliary.rpcData) {
            if (_this.auxiliary.rpcData.hash != result.response.hash) {
              updateTemplate = true;
            }
          }
          _this.auxiliary.rpcData = result.response;
          _this.auxiliary.rpcData.target = bignum.fromBuffer(target);
          callback(null, result.response, updateTemplate);
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
    _this.manager = new Manager(_this.poolConfig, _this.portalConfig);
    _this.manager.on('newBlock', (blockTemplate) => {
      if (_this.stratum) {
        _this.stratum.broadcastMiningJobs(blockTemplate, true);
        if (_this.poolConfig.debug) {
          emitLog('Established new job for updated block template');
        }
      }
    });

    // Handle Share Submissions
    _this.manager.on('share', (shareData, auxShareData, blockValid) => {

      // Calculate Status of Submitted Share
      let shareType = 'valid';
      if (shareData.error && shareData.error === 'job not found') {
        shareType = 'stale';
      } else if (shareData.error) {
        shareType = 'invalid';
      }

      // Process Share/Primary Submission
      if (!blockValid) {
        _this.emit('share', shareData, shareType, blockValid, () => {});
      } else {
        _this.submitBlock(shareData.hex, () => {
          _this.checkBlockAccepted(shareData.hash, _this.primary.daemon, (accepted, tx) => {
            shareData.transaction = tx;
            _this.emit('share', shareData, shareType, accepted, () => {});
            _this.getBlockTemplate((error, result, foundNewBlock) => {
              if (foundNewBlock) {
                emitSpecialLog('Block notification via RPC after primary block submission');
              }
            }, false);
          });
        });
      }

      // Process Auxiliary Block Submission
      if (shareType === 'valid' && _this.poolConfig.auxiliary && _this.poolConfig.auxiliary.enabled) {

        // Calculate Auxiliary Difficulty
        const algorithm = _this.poolConfig.primary.coin.algorithms.mining;
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
              _this.emit('share', auxShareData, shareType, accepted, () => {});
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
      ],
      'rules': [],
    };
    if (_this.poolConfig.primary.coin.segwit) callConfig.rules.push('segwit');
    if (_this.poolConfig.primary.coin.mweb) callConfig.rules.push('mweb');

    // Calculate Current Progress on Sync
    const generateProgress = function() {
      const cmd = _this.poolConfig.primary.coin.getinfo ? 'getinfo' : 'getblockchaininfo';
      _this.primary.daemon.cmd(cmd, [], false, (results) => {
        const blockCount = Math.max.apply(null, results
          .flatMap(result => result.response)
          .flatMap(response => response.blocks));

        // Compare with Peers to Get Percentage Synced
        _this.primary.daemon.cmd('getpeerinfo', [], true, (result) => {
          const peers = result.response;
          const totalBlocks = Math.max.apply(null, peers
            .flatMap(response => response.startingheight));
          const percent = (blockCount / totalBlocks * 100).toFixed(2);
          emitWarningLog(`Downloaded ${ percent }% of blockchain from ${ peers.length } peers`);
        });
      });
    };

    // Check for Blockchain to be Fully Synced
    const checkSynced = function(displayNotSynced) {
      _this.primary.daemon.cmd('getblocktemplate', [callConfig], false, (results) => {
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
        const networkDiffAdjusted = _this.poolConfig.statistics.difficulty;
        _this.poolConfig.ports.forEach(port => {
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


    // Setup Pool Block Polling
    this.setupBlockPolling = function(callback) {

      // Primary (No Auxiliary) ZMQ Subscription
      if (!_this.auxiliary.enabled && _this.primary.zmq.enabled) {
        _this.handlePrimaryBlockZmq(() => {
          if (_this.poolConfig.debug) { emitLog('Finished setting up block polling framework ...'); }
          callback();
        });
  
      // Primary (No Auxilairy) Block Polling
      } else if (!_this.auxiliary.enabled) {
        _this.handlePrimaryBlockPolling();
        if (_this.poolConfig.debug) { emitLog('Finished setting up block polling framework ...'); }
        callback();
  
      // Primary ZMQ Subscription, Auxiliary ZMQ Subscription
      } else if (_this.auxiliary.enabled && _this.primary.zmq.enabled &&
        _this.auxiliary.zmq.enabled) {
        _this.handlePrimaryBlockZmq(() => {
          _this.handleAuxiliaryBlockZmq(() => {
            if (_this.poolConfig.debug) { emitLog('Finished setting up block polling framework ...'); }
            callback();
          });
        });
  
      // Primary Block Polling, Auxiliary ZMQ Subscription
      } else if (_this.auxiliary.enabled && !_this.primary.zmq.enabled &&
        _this.auxiliary.zmq.enabled) {
        _this.handlePrimaryBlockPolling();
        _this.handleAuxiliaryBlockZmq(() => {
          if (_this.poolConfig.debug) { emitLog('Finished setting up block polling framework ...'); }
          callback();
        });
  
      // Primary ZMQ Subscription, Auxiliary Block Polling
      } else if (_this.auxiliary.enabled && _this.primary.zmq.enabled &&
        !_this.auxiliary.zmq.enabled) {
        _this.handlePrimaryBlockZmq(() => {
          _this.handleAuxiliaryBlockPolling();
          if (_this.poolConfig.debug) { emitLog('Finished setting up block polling framework ...'); }
          callback();
        });
  
      // Primary Block Polling, Auxiliary Block Polling
      } else {
        _this.handleCombinedBlockPolling();
        if (_this.poolConfig.debug) { emitLog('Finished setting up block polling framework ...'); }
        callback();
      }
    };
  

  // Process Block when Found
  /* istanbul ignore next */
  this.processBlockNotify = function(blockHash) {
    const currentJob = _this.manager.currentJob;
    if ((typeof(currentJob) !== 'undefined') && (blockHash !== currentJob.rpcData.previousblockhash)) {
      _this.getBlockTemplate((error) => {
        if (error) {
          emitErrorLog(`Block notify error getting block template for ${ _this.poolConfig.primary.coin.name }`);
        } else {
          emitLog(`Block template for ${ _this.poolConfig.primary.coin.name } updated successfully`);
        }
      }, false);
    }
  };

  // Initialize Pool Peers
  /* istanbul ignore next */
  this.setupPeer = function() {

    // Establish Peer Settings
    _this.poolConfig.settings.verack = false;
    _this.poolConfig.settings.validConnectionConfig = true;

    // Check for P2P Configuration
    if (!_this.poolConfig.p2p || !_this.poolConfig.p2p.enabled) {
      limitMessages(() => {
        emitLog('p2p has been disabled in the configuration');
      });
      return;
    }
    if (_this.poolConfig.settings.testnet && !_this.poolConfig.primary.coin.testnet.peerMagic) {
      emitErrorLog('p2p cannot be enabled in testnet without peerMagic set in testnet configuration');
      return;
    } else if (!_this.poolConfig.primary.coin.mainnet.peerMagic) {
      emitErrorLog('p2p cannot be enabled without peerMagic set in mainnet configuration');
      return;
    }

    // Establish Peer Server
    _this.peer = new Peer(_this.poolConfig);
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
    _this.stratum = new Network(_this.poolConfig, _this.portalConfig, _this.authorizeFn);
    _this.stratum.on('started', () => {
      const stratumPorts = _this.poolConfig.ports
        .filter(port => port.enabled)
        .flatMap(port => port.port);
      _this.poolConfig.statistics.stratumPorts = stratumPorts;
      _this.stratum.broadcastMiningJobs(_this.manager.currentJob, true);
      callback();
    });

    // Establish Timeout Functionality
    _this.stratum.on('broadcastTimeout', () => {
      if (_this.poolConfig.debug) {
        emitLog(`No new blocks for ${ _this.poolConfig.settings.jobRebroadcastTimeout } seconds - updating transactions & rebroadcasting work`);
      }
      _this.getBlockTemplate((error, rpcData, processedBlock) => {
        if (error || processedBlock) return;
        _this.manager.updateCurrentJob(rpcData);
        if (_this.poolConfig.debug) {
          emitLog('Updated existing job for current block template');
        }
      }, false);
    });

    // Establish New Connection Functionality
    _this.stratum.on('client.connected', (client) => {
      if (typeof(_this.difficulty[client.socket.localPort]) !== 'undefined') {
        _this.difficulty[client.socket.localPort].manageClient(client);
      }

      // Emit Event when Difficulty is Queued
      client.on('difficultyQueued', (diff) => {
        emitLog('Difficulty update queued for worker: ' + client.addrPrimary + ' (' + diff + ')');
      });

      // Emit Event when Difficulty is Updated
      client.on('difficultyChanged', (diff) => {
        emitLog('Difficulty updated successfully for worker: ' + client.addrPrimary + ' (' + diff + ')');
      });

      // Establish Client Subscription Functionality
      client.on('subscription', (params, callback) => {
        const extraNonce = _this.manager.extraNonceCounter.next();
        switch (_this.poolConfig.primary.coin.algorithms.mining) {

        // Kawpow/Firopow Subscription
        case 'kawpow':
        case 'firopow':
          callback(null, extraNonce, extraNonce);
          break;

        // Default Subscription
        default:
          callback(null, extraNonce, _this.manager.extraNonce2Size);
          break;
        }

        const validPorts = _this.poolConfig.ports
          .filter(port => port.port === client.socket.localPort)
          .filter(port => typeof port.difficulty.initial !== undefined);
        if (validPorts.length >= 1) {
          client.sendDifficulty(validPorts[0].difficulty.initial);
        } else {
          client.sendDifficulty(8);
        }
        const jobParams = _this.manager.currentJob.getJobParams(client, true);
        client.sendMiningJob(jobParams);
      });

      // Establish Client Submission Functionality
      client.on('submit', (message, callback) => {
        let result, submission;
        switch (_this.poolConfig.primary.coin.algorithms.mining) {

        // Kawpow/Firopow Submission
        case 'kawpow':
        case 'firopow':
          submission = {
            extraNonce1: client.extraNonce1,
            nonce: message.params[2].substr(2),
            headerHash: message.params[3].substr(2),
            mixHash: message.params[4].substr(2),
          };
          result = _this.manager.processShare(
            message.params[1],
            client.previousDifficulty,
            client.difficulty,
            client.remoteAddress,
            client.socket.localPort,
            client.addrPrimary,
            client.addrAuxiliary,
            submission,
          );
          break;

        // Default Submission
        default:
          submission = {
            extraNonce1: client.extraNonce1,
            extraNonce2: message.params[2],
            nTime: message.params[3],
            nonce: message.params[4],
            versionBit: message.params[5],
            versionMask: client.versionMask,
            asicboost: client.asicboost,
          };
          result = _this.manager.processShare(
            message.params[1],
            client.previousDifficulty,
            client.difficulty,
            client.remoteAddress,
            client.socket.localPort,
            client.addrPrimary,
            client.addrAuxiliary,
            submission,
          );
          break;
        }

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
    const startMessage = `Stratum pool server started for ${ _this.poolConfig.name }`;
    const infoLines = [startMessage,
      `Coins Connected:\t${ _this.poolConfig.coins }`,
      `Network Connected:\t${ _this.poolConfig.settings.testnet ? 'Testnet' : 'Mainnet' }`,
      `Current Block Height:\t${ _this.manager.currentJob.rpcData.height }`,
      `Current Connect Peers:\t${ _this.poolConfig.statistics.connections }`,
      `Current Block Diff:\t${ _this.manager.currentJob.difficulty * Algorithms[_this.poolConfig.primary.coin.algorithms.mining].multiplier }`,
      `Network Difficulty:\t${ _this.poolConfig.statistics.difficulty }`,
      `Stratum Port(s):\t${ _this.poolConfig.statistics.stratumPorts.join(', ') }`,
      `Pool Fee Percentage:\t${ _this.poolConfig.settings.feePercentage * 100 }%`,
    ];
    if (_this.primary.zmq.enabled) {
      infoLines.push(`ZMQ Primary Enabled:\tYes`);
    } else if (typeof _this.poolConfig.settings.blockRefreshInterval === 'number' && _this.poolConfig.settings.blockRefreshInterval > 0) {
      infoLines.push(`Block Polling Every:\t${ _this.poolConfig.settings.blockRefreshInterval } ms`);
    }
    if (_this.auxiliary.enabled) {
      infoLines.push(`Auxiliary Chain:\t${ _this.poolConfig.auxiliary.coin.name }`);
      if (_this.auxiliary.zmq.enabled) {
        infoLines.push(`ZMQ Auxiliary Enabled:\tYes`);
      } else if (typeof _this.poolConfig.settings.blockRefreshInterval === 'number' && _this.poolConfig.settings.blockRefreshInterval > 0) {
        infoLines.push(`Auxiliary Polling Every:\t${ _this.poolConfig.settings.blockRefreshInterval } ms`);
      }
    }
    limitMessages(() => {
      emitSpecialLog(infoLines.join('\n\t\t\t\t'));
    });
    _this.responseFn(true);
  };
};

module.exports = Pool;
Pool.prototype.__proto__ = events.EventEmitter.prototype;
