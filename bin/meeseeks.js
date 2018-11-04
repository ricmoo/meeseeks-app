#!/usr/bin/node

'use strict';

const fs = require('fs');
const inherits = require('util').inherits;

const cli = require('ethers-cli/lib/cli');
const ethers = require('ethers');
const ipfs = (function() {
    const ipfsAPI = require('ipfs-api');
    return ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' });
})();

let options = {
    _accounts: true,
    _provider: true,
    _transaction: true,
    _name: 'meeseeks',
};

let plugins = {};

function PublishPlugin() {
    cli.Plugin.call(this);
}
inherits(PublishPlugin, cli.Plugin);

PublishPlugin.prototype.help = "FILENAME";
PublishPlugin.prototype.prepare = function(opts) {
    if (opts.args.length !== 2) {
        throw new Error('publish requires FILENAME');
    }
    this.filename = opts.args[1];
    return Promise.resolve();
}
PublishPlugin.prototype.run = function() {
    let content = fs.readFileSync(this.filename);
    console.log('Publishing: ', this.filename, '(' + content.length + ' bytes)');
    return ipfs.files.add(content).then((results) => {
        console.log('  Hash:', results[0].hash);
    });
}
plugins['publish'] = new PublishPlugin();


function LinkPlugin() {
    cli.Plugin.call(this);
}
inherits(LinkPlugin, cli.Plugin);

LinkPlugin.prototype.help = "NAME HASH";
LinkPlugin.prototype.prepare = function(opts) {
    this.account = opts.accounts[0];
    if (!this.account) { throw new Error('link requires an account'); }

    if (opts.args.length !== 3) {
        throw new Error('link requires NAME HASH');
    }
    this.provider = opts.provider;
    this.name = opts.args[1];
    this.hash = opts.args[2];

    return Promise.resolve();
}
LinkPlugin.prototype.run = function() {
    let namehash = ethers.utils.namehash(this.name);
    console.log('Linking: ', this.name, ' => ', this.hash);
    return this.provider.getNetwork().then((network) => {
        let contract = new ethers.Contract(network.ensAddress, [
            "function resolver(bytes32) view returns (address)"
        ], this.provider);
        return contract.resolver(namehash).then((resolver) => {
            if (resolver === ethers.constants.AddressZero) {
                throw new Error('missing resolver - ' + this.name);
            }
            let contract = new ethers.Contract(resolver, [
                "function setText(bytes32, string, string)"
            ], this.account);
            return contract.setText(namehash, 'vnd.app.meeseeks', this.hash);
        });
    });
}
plugins['link'] = new LinkPlugin();


cli.run(options, plugins)
