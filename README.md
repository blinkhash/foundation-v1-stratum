<p align="center">
    <img src="resources/blinkhash-logo-text3.png" height="110"></img>
</p>

---

## Introduction

This portal is a high performance Stratum server written entirely in Node.js. One instance of this software can startup and manage multiple coin pools, each with their own daemon and Stratum ports. This server itself was built to be efficient, transparent, and easy to setup, while still maintaining greater scalability than many of the other open-source Stratum servers.

#### Notice

This repository is simply a module. It will do nothing on its own. Unless you're a Node.js developer who would like to learn more regarding stratum authentication and raw share data, this module will not be of use to you. For a complete backend server that implements this module, see https://github.com/blinkhash/blinkhash-server. It handles payments, database integration, multi-coin/pool support, and more.

---

## Specifications

#### Features

* Daemon RPC interface
* Stratum TCP socket server
* Block template / job manager
* P2P to get block notifications as peer node
* Optimized generation transaction building
* Connecting to multiple daemons for redundancy
* Process share submissions
* Session managing for purging DDoS/flood initiated zombie workers
* Auto ban IPs that are flooding with invalid shares
* __POW__ (proof-of-work) & __POS__ (proof-of-stake) support
* Transaction messages support
* Vardiff (variable difficulty / share limiter)
* When started with a coin daemon that hasn't finished syncing to the network it shows the blockchain download progress and initializes once synced

---

## Setup

#### Requirements

* Coin daemon(s) (Find the coin's repository and build the latest version from source)
* [Node.js](http://nodejs.org/) v12.0+ (Tested with v12.16.1) ([Instructions](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager))

Note: Those are legitimate requirements. If you use old versions of Node.js or Redis that may come with your system package manager then you will have problems. Follow the linked instructions to get the last stable versions.

#### 1) Setting up Coin Daemon

Follow the build/install instructions for your coin daemon. Your coin.conf file should end up looking something like this:

```
daemon=1
rpcuser=blinkhash
rpcpassword=blinkhash
rpcport=26710
```

For redundancy, it's recommended to have at least two daemon instances running in case one drops out-of-sync or offline. All instances listed will be polled for block/transaction updates and be used for submitting blocks. Creating a backup daemon involves spawning a daemon using the `-datadir=/backup` command-line argument which creates a new daemon instance with it's own config directory and coin.conf file. Learn about the daemon, how to use it and how it works if you want to be a good pool operator. For starters, be sure to read:
   * https://en.bitcoin.it/wiki/Running_bitcoind
   * https://en.bitcoin.it/wiki/Data_directory
   * https://en.bitcoin.it/wiki/Original_Bitcoin_client/API_Calls_list
   * https://en.bitcoin.it/wiki/Difficulty

#### 2) Downloading & Installing

This module is configured to primarily work with https://github.com/blinkhash/blinkhash-server. While you can install it just by following the instructions on its repository, you can also do so directly with the following instructions. These commands will assume that you already have downloaded and are located in the same folder as 'blinkhash-server/'.

```bash
git clone https://github.com/blinkhash/blinkhash-stratum-pool blinkhash-server/node_modules/stratum-pool
cd blinkhash-server/node_modules/stratum-pool
npm update
```

---

## Credits

* [Nick Sarris / Blinkhash](https://github.com/blinkhash) - developer behind Blinkhash Mining Pool/NOMP updates
* [vekexasia](//github.com/vekexasia) - co-developer & great tester
* [LucasJones](//github.com/LucasJones) - got p2p block notify working and implemented additional hashing algos
* [TheSeven](//github.com/TheSeven) - answering an absurd amount of my questions, found the block 1-16 problem, provided example code for peer node functionality
* [pronooob](https://dogehouse.org) - knowledgeable & helpful
* [Slush0](//github.com/slush0/stratum-mining) - stratum protocol, documentation and original python code
* [viperaus](//github.com/viperaus/stratum-mining) - scrypt adaptions to python code
* [ahmedbodi](//github.com/ahmedbodi/stratum-mining) - more algo adaptions to python code
* [steveshit](//github.com/steveshit) - ported X11 hashing algo from python to node module

---

## License

Released under the GNU General Public License v2
http://www.gnu.org/licenses/gpl-2.0.html
