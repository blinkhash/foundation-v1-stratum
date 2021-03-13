## Introduction

This portal is a high performance Stratum server written entirely in Node.js. One instance of this software can startup and manage multiple coin pools, each with their own daemon and Stratum ports. This server itself was built to be efficient, transparent, and easy to setup, while still maintaining greater scalability than many of the other open-source Stratum servers. This repository itself, however, is simply a module. It will do nothing on its own. Unless you're a Node.js developer who would like to learn more regarding stratum authentication and raw share data, this module will not be of use to you. For a complete backend server that implements this module, see https://github.com/blinkhash/blinkhash-server. It handles payments, database integration, multi-coin/pool support, and more.

---

## Getting Started

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

## Donations

Maintaining this project has always been driven out of nothing more than a desire to give back to the mining community, however I always appreciate donations, especially if this repository helps you in any way.

- Bitcoin: 3EbrVYLxN5WeQmPpL6owo3A7rJELXecbbc
- Ethereum: 0xd3e3daED621d228244Fa89A3dd8AF07B52E72319
- Litecoin: MFWpARrSADAy3Qj79C4pSasS9F156QipwC
- ZCash: t1NSk8gyiou8TxWRZTVuUkfM5f9riopN58A

---

## License

Released under the GNU General Public License v2. See http://www.gnu.org/licenses/gpl-2.0.html for more information
