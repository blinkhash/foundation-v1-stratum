/*
 *
 * Daemon (Updated)
 *
 */

// Import Required Modules
let http = require('http');
let cp = require('child_process');
let events = require('events');
let async = require('async');

/**
 * The Daemon interface interacts with the coin Daemon by using the RPC interface.
 * in order to make it work it needs, as constructor, an array of objects containing
 * - 'host'    : hostname where the coin lives
 * - 'port'    : port where the coin accepts RPC connections
 * - 'user'    : username of the coin for the RPC interface
 * - 'password': password for the RPC interface of the coin
**/

// DaemonInterface Main Function
let DaemonInterface = function(daemons, logger) {

    // Establish Private Daemon Variables
    let _this = this;
    logger = logger || function(severity, message) {
        console.log(severity + ': ' + message);
    };

    // Check if All Daemons are Online
    function isOnline(callback) {
        cmd('getpeerinfo', [], function(results) {
            let allOnline = results.every(function(result) {
                return !results.error;
            });
            callback(allOnline);
            if (!allOnline) {
                _this.emit('connectionFailed', results);
            }
        });
    }

    // Index Daemons from Parameter
    function indexDaemons() {
        for (let i = 0; i < daemons.length; i++) {
            daemons[i]['index'] = i;
        }
        return daemons;
    }

    // Establish Instances
    let instances = indexDaemons();

    // Initialize Daemons
    function initDaemons() {
        isOnline(function(online) {
            if (online) {
                _this.emit('online');
            }
        });
    }

    // Configure Daemon HTTP Requests
    function performHttpRequest(instance, jsonData, callback) {

        // Establish HTTP Options
        let options = {
            hostname: (typeof(instance.host) === 'undefined' ? '127.0.0.1' : instance.host),
            port: instance.port,
            method: 'POST',
            auth: instance.user + ':' + instance.password,
            headers: {
                'Content-Length': jsonData.length
            }
        };

        // Attempt to Parse JSON from Response
        let parseJson = function(res, data) {
            let dataJson;
            if ((res.statusCode === 401) || (res.statusCode === 403)) {
                logger('error', 'Unauthorized RPC access - invalid RPC username or password');
                return;
            }
            try {
                dataJson = JSON.parse(data);
            }
            catch(e) {
                if (data.indexOf(':-nan') !== -1) {
                    data = data.replace(/:-nan,/g, ":0");
                    parseJson(res, data);
                    return;
                }
                logger('error', 'Could not parse RPC data from daemon instance  ' + instance.index
                    + '\nRequest Data: ' + jsonData
                    + '\nReponse Data: ' + data);

            }
            if (dataJson) {
                callback(dataJson.error, dataJson, data);
            }
        };

        // Establish HTTP Request
        let req = http.request(options, function(res) {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                parseJson(res, data);
            });
        });

        // Configure Error Behavior
        req.on('error', function(e) {
            if (e.code === 'ECONNREFUSED')
                callback({type: 'offline', message: e.message}, null);
            else
                callback({type: 'request error', message: e.message}, null);
        });

        // Return JSON Output
        req.end(jsonData);
    }

    // Batch RPC Commands
    function batchCmd(cmdArray, callback) {
        let requestJson = [];
        for (let i = 0; i < cmdArray.length; i++) {
            requestJson.push({
                method: cmdArray[i][0],
                params: cmdArray[i][1],
                id: Date.now() + Math.floor(Math.random() * 10) + i
            });
        }
        let serializedRequest = JSON.stringify(requestJson);
        performHttpRequest(instances[0], serializedRequest, function(error, result) {
            callback(error, result);
        });
    }

    // Single RPC Command
    function cmd(method, params, callback, streamResults, returnRawData) {
        let results = [];
        async.each(instances, function(instance, eachCallback) {
            let itemFinished = function(error, result, data) {
                let returnObj = {
                    error: error,
                    response: (result || {}).result,
                    instance: instance
                };
                if (returnRawData) returnObj.data = data;
                if (streamResults) callback(returnObj);
                else results.push(returnObj);
                eachCallback();
                itemFinished = function(){};
            };
            let requestJson = JSON.stringify({
                method: method,
                params: params,
                id: Date.now() + Math.floor(Math.random() * 10)
            });
            performHttpRequest(instance, requestJson, function(error, result, data) {
                itemFinished(error, result, data);
            });
        }, function() {
            if (!streamResults) {
                callback(results);
            }
        });
    }

    // Establish Public Daemon Variables
    this.init = initDaemons;
    this.isOnline = isOnline;
    this.cmd = cmd;
    this.batchCmd = batchCmd;
}

exports.interface = DaemonInterface;
DaemonInterface.prototype.__proto__ = events.EventEmitter.prototype;
