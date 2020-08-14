/*
 *
 * Difficulty (Updated)
 *
 */

// Import Required Modules
var events = require('events');

// Truncate Integer to Fixed Decimal Places
function toFixed(num, len) {
    return parseFloat(num.toFixed(len));
}

// RingBuffer Main Function
function RingBuffer(maxSize) {

    // Establish Manager Variables
    var data = [];
    var cursor = 0;
    var isFull = false;

    // Append to Ring Buffer
    this.append = function(x) {
        if (isFull) {
            data[cursor] = x;
            cursor = (cursor + 1) % maxSize;
        }
        else {
            data.push(x);
            cursor++;
            if (data.length === maxSize) {
                cursor = 0;
                isFull = true;
            }
        }
    };

    // Average Ring Buffer
    this.avg = function() {
        var sum = data.reduce(function(a, b) { return a + b });
        return sum / (isFull ? maxSize : cursor);
    };

    // Size of Ring Buffer
    this.size = function() {
        return isFull ? maxSize : cursor;
    };

    // Clear Ring Buffer
    this.clear = function() {
        data = [];
        cursor = 0;
        isFull = false;
    };
}

// Difficulty Main Function
var Difficulty = function(port, difficultyOptions) {

    // Establish Difficulty Variables
    var _this = this;
    var bufferSize, tMin, tMax;
    var variance = difficultyOptions.targetTime * (difficultyOptions.variancePercent / 100);
    bufferSize = difficultyOptions.retargetTime / difficultyOptions.targetTime * 4;
    tMin = difficultyOptions.targetTime - variance;
    tMax = difficultyOptions.targetTime + variance;

    // Manage Individual Clients
    this.manageClient = function(client) {

        // Check if Client is Connected to VarDiff Port
        var stratumPort = client.socket.localPort;
        if (stratumPort != port) {
            console.error("Handling a client which is not of this vardiff?");
        }

        // Establish Client Variables
        var options = difficultyOptions;
        var lastTs;
        var lastRtc;
        var timeBuffer;

        // Manage Client Submission
        client.on('submit', function() {
            var ts = (Date.now() / 1000) | 0;
            if (!lastRtc) {
                lastRtc = ts - options.retargetTime / 2;
                lastTs = ts;
                timeBuffer = new RingBuffer(bufferSize);
                return;
            }
            var sinceLast = ts - lastTs;
            timeBuffer.append(sinceLast);
            lastTs = ts;
            if ((ts - lastRtc) < options.retargetTime && timeBuffer.size() > 0) {
                return;
            }
            lastRtc = ts;
            var avg = timeBuffer.avg();
            var ddiff = options.targetTime / avg;
            if (avg > tMax && client.difficulty > options.minDiff) {
                if (options.x2mode) {
                    ddiff = 0.5;
                }
                if (ddiff * client.difficulty < options.minDiff) {
                    ddiff = options.minDiff / client.difficulty;
                }
            }
            else if (avg < tMin) {
                if (options.x2mode) {
                    ddiff = 2;
                }
                var diffMax = options.maxDiff;
                if (ddiff * client.difficulty > diffMax) {
                    ddiff = diffMax / client.difficulty;
                }
            }
            else {
                return;
            }
            var newDiff = toFixed(client.difficulty * ddiff, 8);
            timeBuffer.clear();
            _this.emit('newDifficulty', client, newDiff);
        });
    };
};

// Export Difficulty
module.exports = Difficulty;
Difficulty.prototype.__proto__ = events.EventEmitter.prototype;
