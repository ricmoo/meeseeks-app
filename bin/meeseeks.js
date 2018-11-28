#!/usr/bin/env node

'use strict';

const fs = require('fs');
const inherits = require('util').inherits;

const UglifyJS = require("uglify-es");

const cli = require('ethers-cli/lib/cli');
const ethers = require('ethers');
const ipfs = (function() {
    const ipfsAPI = require('ipfs-api');
    return ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' });
})();
const basex = require('base-x');

const base32 = new basex("abcdefghijklmnopqrstuvwxyz234567");
const base58 = new basex("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");

let options = {
    _accounts: true,
    _provider: true,
    _transaction: true,
    _name: 'meeseeks',
};

function getMimeType(filename) {
    let ext = filename.toLowerCase().match(/\.([^.]*)$/);
    if (!ext) { return 'application/octet-stream'; }
    switch (ext[1]) {
        case 'gif':
            return 'image/gif';
        case 'jpeg':
        case 'jpg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        default:
            break;
    }
    return 'application/octet-stream';
}

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
    console.log('Publishing:', this.filename, '(' + content.length + ' bytes)');
    return ipfs.files.add(content).then((results) => {
        console.log('  Hash: ' + results[0].hash);
        let subdomain = base32.encode(base58.decode(results[0].hash).slice(2));
        console.log('  URL:  https://0xg' + subdomain + '.meeseeks.app');
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
    let hash = ethers.utils.concat([ "0x01", base58.decode(this.hash) ]);
    console.log(hash);
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
                "function setText(bytes32, string, string)",
                "function setContenthash(bytes32, bytes)"
            ], this.account);
            //return contract.setText(namehash, 'vnd.app.meeseeks', this.hash);
            return contract.setContenthash(namehash, hash);
        });
    });
}
plugins['link'] = new LinkPlugin();


function FlattenPlugin() {
    cli.Plugin.call(this);
}
inherits(FlattenPlugin, cli.Plugin);

FlattenPlugin.prototype.help = "FILENAME (experimental)";
FlattenPlugin.prototype.prepare = function(opts) {
    if (opts.args.length !== 2) {
        throw new Error('flatten requires FILENAME');
    }
    this.filename = opts.args[1];

    return Promise.resolve();
}
FlattenPlugin.prototype.run = function() {
    let content = fs.readFileSync(this.filename).toString();
    function replImg(all, params) {
        function repl(all, filename) {
            let content = fs.readFileSync(filename).toString('base64');
            return 'src="data:' + getMimeType(filename) + ';base64,' + content + '"';
        }
        params = params.replace(/src\s*=\s*"([^"]*)"/i, repl).trim();
        console.log(JSON.stringify(params));
        return ['<img', (params.length ? ' ': ''), params, '>'].join('');
    }
    function replJs(all, params) {
        let src = null;
        function repl(all, filename) {
            src = filename;
            return '';
        }
        params = params.replace(/src\s*=\s*"([^"]*)"/i, repl).trim();

        let content = fs.readFileSync(src).toString().trim();
        content = UglifyJS.minify(content);

        return [ '<script', (params.length ? ' ': ''), params, '>', content.code, '</script>'].join('');
    }

    content = content.replace(/<\s*img([^>]*)>/ig, replImg);
    content = content.replace(/<\s*script([^>]*)>(\s*<\s*\/\s*script\s*>)/ig, replJs);

    console.log(content);

    return Promise.resolve();
}
plugins['flatten'] = new FlattenPlugin();

cli.run(options, plugins)
