/*
 *
 * Difficulty (Updated)
 *
 */

const events = require('events');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main RingBuffer Function
const RingBuffer = function(maxSize) {

  let data = [];
  let cursor = 0;
  let isFull = false;

  // Append to Ring Buffer
  this.append = function(x) {
    if (isFull) {
      data[cursor] = x;
      cursor = (cursor + 1) % maxSize;
    } else {
      data.push(x);
      cursor += 1;
      if (data.length === maxSize) {
        cursor = 0;
        isFull = true;
      }
    }
  };

  // Average Ring Buffer
  this.avg = function() {
    const sum = data.reduce((a, b) => a + b);
    return sum / (isFull ? maxSize : cursor);
  };

  // Calculate Size of Ring Buffer
  this.size = function() {
    return isFull ? maxSize : cursor;
  };

  // Clear Ring Buffer
  this.clear = function() {
    data = [];
    cursor = 0;
    isFull = false;
  };
};

// Main Difficulty Function
const Difficulty = function(port, difficulty, showLogs) {

  const _this = this;
  _this.options = difficulty;

  const logging = showLogs;
  let lastTs, lastRtc, timeBuffer;
  const variance = difficulty.targetTime * difficulty.variance;
  const bufferSize = difficulty.retargetTime / difficulty.targetTime * 4;
  const tMin = difficulty.targetTime - variance;
  const tMax = difficulty.targetTime + variance;

  // Update Difficulty on Share Submission
  this.updateDifficulty = function(client) {
    const ts = (Date.now() / 1000) | 0;
    if (!lastRtc) {
      lastRtc = ts - _this.options.retargetTime / 2;
      lastTs = ts;
      timeBuffer = new RingBuffer(bufferSize);
      if (logging) console.log('Setting difficulty on client initialization');
      return;
    }
    const sinceLast = ts - lastTs;
    timeBuffer.append(sinceLast);
    lastTs = ts;
    const avg = timeBuffer.avg();
    let ddiff = _this.options.targetTime / avg;
    if ((ts - lastRtc) < _this.options.retargetTime && timeBuffer.size() > 0) {
      if (logging) console.log('No difficulty update required');
      return;
    }
    lastRtc = ts;
    if (avg > tMax && client.difficulty > _this.options.minimum) {
      if (logging) console.log('Decreasing current difficulty');
      if (ddiff * client.difficulty < _this.options.minimum) {
        ddiff = _this.options.minimum / client.difficulty;
      }
    } else if (avg < tMin && client.difficulty < _this.options.maximum) {
      if (logging) console.log('Increasing current difficulty');
      if (ddiff * client.difficulty > _this.options.maximum) {
        ddiff = _this.options.maximum / client.difficulty;
      }
    } else {
      if (logging) console.log('No difficulty update required');
      return;
    }
    const newDiff = utils.toFixed(client.difficulty * ddiff, 8);
    timeBuffer.clear();
    _this.emit('newDifficulty', client, newDiff);
  };

  // Manage Individual Clients
  this.manageClient = function(client) {
    const stratumPort = client.socket.localPort;
    if (stratumPort != port) {
      console.error('Handling a client which is not of this vardiff?');
    }
    client.on('submit', () => _this.updateDifficulty(client));
  };
};

module.exports = Difficulty;
Difficulty.prototype.__proto__ = events.EventEmitter.prototype;
