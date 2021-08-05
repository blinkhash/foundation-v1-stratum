/*
 *
 * Client (Updated)
 *
 */

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
  this.pendingDifficulty = null;
  this.remoteAddress = _this.options.socket.remoteAddress;
  this.shares = { valid: 0, invalid: 0 };
  this.socket = _this.options.socket;

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
    return password;
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
        _this.emit('triggerBan', _this.shares.invalid + ' out of the last ' + totalShares + ' shares were invalid');
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
      _this.handleAuthorize(message, true);
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
  };

  // Manage Stratum Authorization
  this.handleAuthorize = function(message) {
    const workerData = _this.validateName(message.params[0]);
    _this.addrPrimary = workerData[0];
    _this.addrAuxiliary = workerData[1];
    _this.workerPassword = _this.validatePassword(message.params[1]);
    _this.options.authorizeFn(
      _this.remoteAddress,
      _this.options.socket.localPort,
      _this.addrPrimary,
      _this.addrAuxiliary,
      _this.workerPassword,
      (result) => {
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
    message.params[1] = _this.validatePassword(message.params[1]);
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
      method: 'mining.set_difficulty',
      params: [difficulty],
    });
    return true;
  };

  // Broadcast Mining Job to Stratum Client
  /* istanbul ignore next */
  this.sendMiningJob = function(jobParams) {
    const lastActivityAgo = Date.now() - _this.lastActivity;
    if (lastActivityAgo > _this.options.connectionTimeout * 1000) {
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
      method: 'mining.notify',
      params: jobParams
    });
  };
};

module.exports = Client;
Client.prototype.__proto__ = events.EventEmitter.prototype;
