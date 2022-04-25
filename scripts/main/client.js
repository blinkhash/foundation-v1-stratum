/*
 *
 * Client (Updated)
 *
 */

const Algorithms = require('./algorithms');
const events = require('events');

////////////////////////////////////////////////////////////////////////////////

/**
 * Defining each client that connects to the stratum server.
 * Emits:
 *  - subscription(obj, cback(error, extraNonce1, extraNonce2Size))
 *  - submit(data(name, jobID, extraNonce2, ntime, nonce))
**/

// Main Client Function
const Client = function(options) {

  const _this = this;
  this.options = options;
  this.authorized = false;
  this.difficulty = 0;
  this.lastActivity = Date.now();
  this.remoteAddress = _this.options.socket.remoteAddress;
  this.shares = { valid: 0, invalid: 0 };
  this.socket = _this.options.socket;

  // Difficulty Options
  this.pendingDifficulty = null;
  this.staticDifficulty = false;

  // Validate Worker Name
  this.validateName = function(name) {
    if (name.length >= 1) {
      name = name.toString().replace(/[^a-zA-Z0-9.,]+/g, '');
    }
    const addresses = name.split(',');
    if (addresses.length > 1) {
      return [addresses[0], addresses[1]];
    } else {
      return [addresses[0], null];
    }
  };

  // Validate Worker Password
  this.validatePassword = function(password) {
    if (password.length >= 1) {
      password = password.toString().replace(/[^a-zA-Z0-9.,=]+/g, '');
    }
    const values = password.split(',');
    const flags = {};
    values.forEach((value) => {
      if (/^d=[+-]?(\d*\.)?\d+$/.test(value)) {
        flags.difficulty = parseFloat(value.split('=')[1]);
      }
    });
    return flags;
  };

  // Check for Banning Users
  this.considerBan = function(shareValid) {
    if (shareValid === true) {
      _this.shares.valid += 1;
    } else {
      _this.shares.invalid += 1;
    }
    const totalShares = _this.shares.valid + _this.shares.invalid;
    if (totalShares >= _this.options.banning.checkThreshold) {
      const percentBad = (_this.shares.invalid / totalShares);
      if (percentBad < _this.options.banning.invalidPercent) {
        this.shares = { valid: 0, invalid: 0 };
      } else {
        _this.emit('triggerBan', _this.shares.invalid + ' out of the last ' + totalShares + ' shares were not valid');
        _this.socket.destroy();
        return true;
      }
    }
    return false;
  };

  // Manage JSON Functionality
  this.sendJson = function() {
    let response = '';
    Object.keys(arguments).forEach(arg => {
      response += JSON.stringify(arguments[arg]) + '\n';
    });
    _this.options.socket.write(response);
  };

  // Establish Stratum Connection
  /* istanbul ignore next */
  this.setupClient = function() {

    // Setup Main Socket Connection
    let dataBuffer = '';
    const socket = _this.options.socket;
    socket.setEncoding('utf8');
    if (_this.options.tcpProxyProtocol === true) {
      socket.once('data', (d) => {
        if (d.indexOf('PROXY') === 0) {
          _this.remoteAddress = d.split(' ')[2];
        } else {
          _this.emit('tcpProxyError', d);
        }
        _this.emit('checkBan');
      });
    } else {
      _this.emit('checkBan');
    }

    socket.on('data', (d) => {
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
        messages.forEach((message) => {
          if (message === '') return;
          let messageJson;
          try {
            messageJson = JSON.parse(message);
          } catch(e) {
            if (_this.options.tcpProxyProtocol !== true || d.indexOf('PROXY') !== 0) {
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

    socket.on('close', () => {
      _this.emit('socketDisconnect');
    });

    socket.on('error', (e) => {
      if (e.code !== 'ECONNRESET')
        _this.emit('socketError', e);
    });
  };

  // Handle Stratum Messages
  this.handleMessage = function(message) {
    switch (message.method) {

    // Supported Stratum Messages
    case 'mining.subscribe':
      _this.handleSubscribe(message);
      break;
    case 'mining.authorize':
      _this.handleAuthorize(message);
      break;
    case 'mining.configure':
      _this.handleConfigure(message);
      break;
    case 'mining.multi_version':
      _this.handleMultiVersion(message);
      break;
    case 'mining.submit':
      _this.lastActivity = Date.now();
      _this.handleSubmit(message);
      break;

      // Unsupported Stratum Messages
    case 'mining.get_transactions':
      _this.sendJson({
        id: message.id,
        result: [],
        error: [20, 'Not supported.', null]
      });
      break;
    case 'mining.extranonce.subscribe':
      _this.sendJson({
        id: message.id,
        result: false,
        error: [20, 'Not supported.', null]
      });
      break;
    default:
      _this.emit('unknownStratumMethod', message);
      break;
    }
  };

  // Manage Stratum Subscription
  this.handleSubscribe = function(message) {
    switch (_this.options.algorithm) {

    // Kawpow/Firopow Subscription
    case 'kawpow':
    case 'firopow':
      _this.emit('subscription', {}, (error, extraNonce1) => {
        if (error) {
          _this.sendJson({ id: message.id, result: null, error: error });
          return;
        }
        _this.extraNonce1 = extraNonce1;
        _this.sendJson({
          id: message.id,
          result: [null, extraNonce1],
          error: null
        });
      });
      break;

    // Default Subscription
    default:
      _this.emit('subscription', {}, (error, extraNonce1, extraNonce2Size) => {
        if (error) {
          _this.sendJson({ id: message.id, result: null, error: error });
          return;
        }
        _this.extraNonce1 = extraNonce1;
        _this.sendJson({
          id: message.id,
          result: [
            [
              ['mining.set_difficulty', _this.options.subscriptionId],
              ['mining.notify', _this.options.subscriptionId]
            ],
            extraNonce1,
            extraNonce2Size
          ],
          error: null
        });
      });
      break;
    }
  };

  // Manage Stratum Authorization
  this.handleAuthorize = function(message) {

    // Handle Worker Authentication
    const workerData = _this.validateName(message.params[0]);
    const workerFlags = _this.validatePassword(message.params[1]);

    // Set Initial Variables
    _this.addrPrimary = workerData[0];
    _this.addrAuxiliary = workerData[1];
    _this.workerPassword = message.params[1];

    // Check for Difficulty Flag
    if (workerFlags.difficulty) {
      _this.enqueueNextDifficulty(workerFlags.difficulty);
      _this.staticDifficulty = true;
    }

    // Check to Authorize Worker
    const port = _this.options.socket.localPort;
    _this.options.authorizeFn(_this.remoteAddress, port, _this.addrPrimary, _this.addrAuxiliary, _this.workerPassword, (result) => {
      _this.authorized = (!result.error && result.authorized);
      _this.sendJson({
        id: message.id,
        result: _this.authorized,
        error: result.error
      });
      if (result.disconnect === true) {
        _this.options.socket.destroy();
      }
    });
  };

  // Manage Stratum Configuration
  this.handleConfigure = function(message) {
    if (!_this.options.asicboost) {
      _this.sendJson({
        id: message.id,
        result: {
          'version-rolling': false
        },
        error: null
      });
      _this.asicboost = false;
      _this.versionMask = '00000000';
    } else {
      _this.sendJson({
        id: message.id,
        result: {
          'version-rolling': true,
          'version-rolling.mask': '1fffe000'
        },
        error: null
      });
      _this.asicboost = true;
      _this.versionMask = '1fffe000';
    }
    return true;
  };

  // Manage Stratum Multi-Versions
  this.handleMultiVersion = function(message) {
    if (!_this.options.asicboost) {
      _this.asicboost = false;
      _this.versionMask = '00000000';
    } else {
      const mVersion = parseInt(message.params[0]);
      if (mVersion > 1) {
        _this.asicboost = true;
        _this.versionMask = '1fffe000';
      } else {
        _this.asicboost = false;
        _this.versionMask = '00000000';
      }
    }
    return true;
  };

  // Manage Stratum Submission
  /* istanbul ignore next */
  this.handleSubmit = function(message) {
    if (!_this.addrPrimary) {
      const workerData = _this.validateName(message.params[0]);
      _this.addrPrimary = workerData[0];
      _this.addrAuxiliary = workerData[1];
    }
    if (!_this.authorized) {
      _this.sendJson({
        id: message.id,
        result: null,
        error: [24, 'unauthorized worker', null]
      });
      _this.considerBan(false);
      return;
    }
    if (!_this.extraNonce1) {
      _this.sendJson({
        id: message.id,
        result: null,
        error: [25, 'not subscribed', null]
      });
      _this.considerBan(false);
      return;
    }
    message.params[0] = _this.validateName(message.params[0]);
    _this.emit('submit', message, (error, result) => {
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
    return (_this.addrPrimary || '(unauthorized)') + ' [' + _this.remoteAddress + ']';
  };

  // Push Updated Difficulty to Difficulty Queue
  this.enqueueNextDifficulty = function(requestedNewDifficulty) {
    if (!_this.staticDifficulty) {
      _this.pendingDifficulty = requestedNewDifficulty;
      _this.emit('difficultyQueued', requestedNewDifficulty);
    }
  };

  // Broadcast Difficulty to Stratum Client
  /* istanbul ignore next */
  this.sendDifficulty = function(difficulty) {
    if (difficulty === _this.difficulty) {
      return false;
    }
    _this.previousDifficulty = _this.difficulty;
    _this.difficulty = difficulty;

    // Process Algorithm Difficulty
    switch (_this.options.algorithm) {

    // Kawpow/Firopow Difficulty
    case 'kawpow': 
    case 'firopow': {
      // Calculate Difficulty Padding
      let zeroPad = '';
      const adjPow = Algorithms[_this.options.algorithm].diff / _this.difficulty;
      if ((64 - adjPow.toString(16).length) !== 0) {
        zeroPad = '0';
        zeroPad = zeroPad.repeat((64 - (adjPow.toString(16).length)));
      }
      _this.sendJson({
        id: null,
        method: 'mining.set_target',
        params: [(zeroPad + adjPow.toString(16)).substr(0, 64)],
      });
      break;
    }

    // Default Difficulty
    default:
      _this.sendJson({
        id: null,
        method: 'mining.set_difficulty',
        params: [difficulty],
      });
      break;
    }

    return true;
  };

  // Broadcast Mining Job to Stratum Client
  /* istanbul ignore next */
  this.sendMiningJob = function(jobParams) {

    // Check Processed Shares
    const lastActivityAgo = Date.now() - _this.lastActivity;
    if (lastActivityAgo > _this.options.connectionTimeout * 1000) {
      _this.emit('socketTimeout', 'last submitted a share was ' + (lastActivityAgo / 1000 | 0) + ' seconds ago');
      _this.socket.destroy();
      return;
    }

    // Update Pending Difficulty
    if (_this.pendingDifficulty != null) {
      const result = _this.sendDifficulty(_this.pendingDifficulty);
      _this.pendingDifficulty = null;
      if (result) {
        _this.emit('difficultyChanged', _this.difficulty);
      }
    }

    // Process Job Broadcasting
    switch (_this.options.algorithm) {

    // Kawpow/Firopow Broadcasting
    case 'kawpow': 
    case 'firopow': {

      // Calculate Difficulty Padding
      let zeroPad = '';
      const adjPow = Algorithms[_this.options.algorithm].diff / _this.difficulty;
      if ((64 - adjPow.toString(16).length) !== 0) {
        zeroPad = '0';
        zeroPad = zeroPad.repeat((64 - (adjPow.toString(16).length)));
      }
      jobParams[3] = (zeroPad + adjPow.toString(16)).substr(0, 64);
      _this.sendJson({
        id: null,
        method: 'mining.notify',
        params: jobParams
      });
      break;
    }

    // Default Broadcasting
    default:
      _this.sendJson({
        id: null,
        method: 'mining.notify',
        params: jobParams
      });
      break;
    }
  };
};

module.exports = Client;
Client.prototype.__proto__ = events.EventEmitter.prototype;
