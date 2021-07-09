/*
 *
 * Daemon (Updated)
 *
 */

const http = require('http');
const events = require('events');
const async = require('async');

////////////////////////////////////////////////////////////////////////////////

/**
 * The Daemon interface interacts with the coin Daemon by using the RPC interface.
 * in order to make it work it needs, as constructor, an array of objects containing
 * - 'host'    : hostname where the coin lives
 * - 'port'    : port where the coin accepts RPC connections
 * - 'user'    : username of the coin for the RPC interface
 * - 'password': password for the RPC interface of the coin
**/

// Main Daemon Function
const Daemon = function(daemons, logger) {

  const _this = this;
  this.logger = logger || function(severity, message) {
    console.log(severity + ': ' + message);
  };

  // Configure Daemon HTTP Requests
  this.performHttpRequest = function(instance, jsonData, callback) {
    const options = {
      hostname: instance.host,
      port: instance.port,
      method: 'POST',
      auth: instance.username + ':' + instance.password,
      headers: {
        'Content-Length': jsonData.length
      }
    };

    // Attempt to Parse JSON from Response
    const parseJson = function(res, data) {
      let dataJson;
      if ((res.statusCode === 401) || (res.statusCode === 403)) {
        _this.logger('error', 'Unauthorized RPC access - invalid RPC username or password');
        callback();
        return;
      }
      try {
        dataJson = JSON.parse(data);
      } catch(e) {
        _this.logger('error', 'Could not parse RPC data from daemon instance ' + instance.index
                    + '\nRequest Data: ' + jsonData
                    + '\nReponse Data: ' + data);
        callback();
        return;
      }
      callback(dataJson.error, dataJson, data);
    };

    // Establish HTTP Request
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        parseJson(res, data);
      });
    });

    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        callback({type: 'offline', message: e.message}, null);
      } else {
        callback({type: 'request error', message: e.message}, null);
      }
    });

    req.end(jsonData);
  };

  // Index Daemons from Parameter
  this.indexDaemons = function(daemons) {
    daemons.forEach((daemon, idx) => {
      daemon.index = idx;
    });
    return daemons;
  };

  this.instances = this.indexDaemons(daemons);

  // Check if All Daemons are Online
  this.isOnline = function(callback) {
    this.cmd('getpeerinfo', [], (results) => {
      const allOnline = results.every((result) => {
        return !result.error;
      });
      callback(allOnline);
      if (!allOnline) {
        _this.emit('connectionFailed', results);
      }
    });
  };

  // Initialize Daemons
  this.initDaemons = function(callback) {
    this.isOnline((online) => {
      if (online) {
        _this.emit('online');
      }
      callback(online);
    });
  };

  // Batch RPC Commands
  this.batchCmd = function(cmdArray, callback) {
    const requestJson = [];
    cmdArray.forEach((command, idx) => {
      requestJson.push({
        method: command[0],
        params: command[1],
        id: Date.now() + Math.floor(Math.random() * 10) + idx
      });
    });
    const serializedRequest = JSON.stringify(requestJson);
    _this.performHttpRequest(this.instances[0], serializedRequest, (error, result) => {
      callback(error, result);
    });
  };

  // Handle Single RPC Command
  this.cmd = function(method, params, callback, streamResults, returnRawData) {
    const results = [];
    async.each(this.instances, (instance, eachCallback) => {

      // Build Output Request Data
      const itemFinished = function(error, result, data) {
        const returnObj = {
          error: error,
          response: (result || {}).result,
          instance: instance
        };
        if (returnRawData) returnObj.data = data;
        if (streamResults) callback(returnObj);
        else results.push(returnObj);
        eachCallback();
      };

      // Build Input Request Data
      const requestJson = JSON.stringify({
        method: method,
        params: params,
        id: Date.now() + Math.floor(Math.random() * 10)
      });

      _this.performHttpRequest(instance, requestJson, (error, result, data) => {
        itemFinished(error, result, data);
      });
    }, () => {
      if (!streamResults) {
        callback(results);
      }
    });
  };
};

module.exports = Daemon;
Daemon.prototype.__proto__ = events.EventEmitter.prototype;
