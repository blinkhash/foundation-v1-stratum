/*
 *
 * Network (Updated)
 *
 */

const net = require('net');
const events = require('events');
const utils = require('./utils');
const Client = require('./client');

////////////////////////////////////////////////////////////////////////////////

/**
 * The actual stratum server.
 * It emits the following Events:
 *   - 'client.connected'(StratumClientInstance) - when a new miner connects
 *   - 'client.disconnected'(StratumClientInstance) - when a miner disconnects. Be aware that the socket cannot be used anymore.
 *   - 'started' - when the server is up and running
 **/

// Main Network Function
const Network = function(options, authorizeFn) {

  const _this = this;
  this.options = options;
  this.bannedIPs = {};
  this.stratumClients = {};
  this.stratumServers = {};

  let rebroadcastTimeout;
  const subscriptionCounter = utils.subscriptionCounter();
  const bannedMS = _this.options.banning.time * 1000;

  // Start Stratum Capabilities
  /* istanbul ignore next */
  this.setupNetwork = function() {

    // Interval to Clear Old Bans from BannedIPs
    setInterval(() => {
      Object.keys(_this.bannedIPs).forEach(ip => {
        const banTime = _this.bannedIPs[ip];
        if (Date.now() - banTime > _this.options.banning.time) {
          delete _this.bannedIPs[ip];
        }
      });
    }, 1000 * _this.options.banning.purgeInterval);

    // Start Individual Stratum Servers
    let serversStarted = 0;
    const stratumPorts = _this.options.ports.filter(port => port.enabled);
    stratumPorts.forEach((port) => {
      const currentPort = port.port;
      const server = net.createServer({ allowHalfOpen: false }, (socket) => {
        _this.handleNewClient(socket);
      });
      server.listen(parseInt(currentPort), () => {
        serversStarted += 1;
        if (serversStarted == stratumPorts.length) {
          _this.emit('started');
        }
      });
      _this.stratumServers[currentPort] = server;
    });
  };

  // Stop Stratum Connection
  this.stopServer = function() {
    const stratumPorts = _this.options.ports.filter(port => port.enabled);
    stratumPorts.forEach((port) => {
      const currentPort = port.port;
      const server = _this.stratumServers[currentPort];
      server.close();
    });
    _this.emit('stopped');
  };

  // Check Regarding Banned Clients
  this.checkBan = function(client) {
    if (client.remoteAddress in _this.bannedIPs) {
      const bannedTime = _this.bannedIPs[client.remoteAddress];
      const bannedTimeAgo = Date.now() - bannedTime;
      const timeLeft = bannedMS - bannedTimeAgo;
      if (timeLeft > 0) {
        client.socket.destroy();
        client.emit('kickedBannedIP', timeLeft / 1000 | 0);
      } else {
        delete _this.bannedIPs[client.remoteAddress];
        client.emit('forgaveBannedIP');
      }
    }
  };

  // Manage New Client Connections
  this.handleNewClient = function (socket) {

    // Establish New Stratum Client
    socket.setKeepAlive(true);
    const subscriptionId = subscriptionCounter.next();
    const client = new Client({
      subscriptionId: subscriptionId,
      authorizeFn: authorizeFn,
      socket: socket,
      asicboost: _this.options.primary.coin.asicboost,
      banning: _this.options.banning,
      connectionTimeout: _this.options.settings.connectionTimeout,
      tcpProxyProtocol: _this.options.settings.tcpProxyProtocol
    });
    _this.stratumClients[subscriptionId] = client;

    // Manage Client Behaviors
    _this.emit('client.connected', client);
    client.on('socketDisconnect', () => {
      delete _this.stratumClients[subscriptionId];
      _this.emit('client.disconnected', client);
    });
    client.on('checkBan', () => {
      _this.checkBan(client);
    });
    client.on('triggerBan', () => {
      _this.addBannedIP(client.remoteAddress);
      _this.emit('client.banned', client);
    });

    client.setupClient();
    return subscriptionId;
  };

  // Broadcast New Jobs to Clients
  /* istanbul ignore next */
  this.broadcastMiningJobs = function(template, cleanJobs) {
    Object.keys(_this.stratumClients).forEach(clientId => {
      const client = _this.stratumClients[clientId];
      const jobParams = template.getJobParams(client, cleanJobs);
      client.sendMiningJob(jobParams);
    });
    clearTimeout(rebroadcastTimeout);
    rebroadcastTimeout = setTimeout(() => {
      _this.emit('broadcastTimeout');
    }, _this.options.settings.jobRebroadcastTimeout * 1000);
  };

  // Add Banned IP to List of Banned IPs
  this.addBannedIP = function(ipAddress) {
    _this.bannedIPs[ipAddress] = Date.now();
  };

  // Setup Network on Initialization
  _this.setupNetwork();
};

module.exports = Network;
Network.prototype.__proto__ = events.EventEmitter.prototype;
