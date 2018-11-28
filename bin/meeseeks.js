#!/usr/bin/env node

'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const inherits = require('util').inherits;
const parseUrl = require('url').parse;

const UglifyCSS = require("uglifycss");
const UglifyJS = require("uglify-es");

const cli = require('ethers-cli/lib/cli');
const ethers = require('ethers');
const ipfs = (function() {
    const ipfsAPI = require('ipfs-api');
    return ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' });
})();
const basex = require('base-x');

const version = require('../package.json').version;

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
        case 'css':
            return 'text/css';
        case 'gif':
            return 'image/gif';
        case 'jpeg':
        case 'jpg':
            return 'image/jpeg';
        case 'js':
            return 'application/javascript';
        case 'png':
            return 'image/png';
        default:
            break;
    }
    return 'application/octet-stream';
}

function flatten(filename) {
    let content = fs.readFileSync(filename).toString();

    function replCss(all, params0, params1) {
        let href = [];
        function repl(all, filename) {
            // Remote CSS
            if (filename.indexOf('://') >= 0) { return all; }

            href.push(filename);
            return '';
        }
        params0 = params0.replace(/href\s*=\s*"([^"]*)"/i, repl).trim();
        params1 = params1.replace(/href\s*=\s*"([^"]*)"/i, repl).trim();

        if (href.length === 0) { return all; }
        // @TODO: Complain if more than 1 href?

        return '<style type="text/css">' + UglifyCSS.processString(fs.readFileSync(href[0]).toString()) + "</style>";
    }

    function replImg(all, params) {
        function repl(all, filename) {
            // Remote image
            if (filename.indexOf('://') >= 0) { return all; }

            // Local image; inline it
            let content = fs.readFileSync(filename).toString('base64');
            return 'src="data:' + getMimeType(filename) + ';base64,' + content + '"';
        }
        params = params.replace(/src\s*=\s*"([^"]*)"/i, repl).trim();
        return ['<img', (params.length ? ' ': ''), params, '>'].join('');
    }

    function replJs(all, params) {
        let src = null;
        function repl(all, filename) {
            // Remote JavaScript
            if (filename.indexOf('://') >= 0) { return all; }

            src = filename;
            return '';
        }
        params = params.replace(/src\s*=\s*"([^"]*)"/i, repl).trim();

        // No source, return unmodified
        if (src == null) { return all; }

        let content = fs.readFileSync(src).toString().trim();
        content = UglifyJS.minify(content);

        return [ '<script', (params.length ? ' ': ''), params, '>', content.code, '</script>'].join('');
    }

    // <link rel="stylesheet" href="styles.css">
    content = content.replace(/<\s*link([^>]+)rel\s*=\s*"stylesheet"([^>]*)>/ig, replCss);

    // <img src="blah" />
    content = content.replace(/<\s*img([^>]*)>/ig, replImg);

    // <script src="blah"></script>
    content = content.replace(/<\s*script([^>]*)>(\s*<\s*\/\s*script\s*>)/ig, replJs);

    return content;
}


let plugins = {};

function PublishPlugin() {
    cli.Plugin.call(this);
}
inherits(PublishPlugin, cli.Plugin);

PublishPlugin.prototype.help = "FILENAME";
PublishPlugin.prototype.options = {
    "flatten": "Flatten the file before publishing (experimental)"
};
options.flatten = false;
PublishPlugin.prototype.prepare = function(opts) {
    if (opts.args.length !== 2) {
        throw new Error('publish requires FILENAME');
    }
    this.filename = opts.args[1];
    this.flatten = opts.options.flatten;
    return Promise.resolve();
}
PublishPlugin.prototype.run = function() {
    let content = null;
    if (this.flatten) {
        content = Buffer.from(flatten(this.filename));
    } else {
        content = fs.readFileSync(this.filename);
    }
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
    let content = flatten(this.filename);
    console.log(content);

    return Promise.resolve();
}
plugins['flatten'] = new FlattenPlugin();

function ServePlugin() {
    cli.Plugin.call(this);
}
inherits(ServePlugin, cli.Plugin);

ServePlugin.prototype.help = "FILENAME";
ServePlugin.prototype.options = {
    port: "port to run the server on (default 8000; 8443 for ssl)",
    key: "path to SSL private key",
    certificate: "path to SSL certificate",
};
options.port = "";
options.key = "";
options.certificate = "";
ServePlugin.prototype.prepare = function(opts) {
    if (opts.args.length !== 2) {
        throw new Error('serve requires FILENAME');
    }
    this.filename = opts.args[1];

    if (opts.options.key && opts.options.certificate) {
        let options = {
           key: fs.readFileSync(opts.options.key).toString(),
           cert: fs.readFileSync(opts.options.certificate).toString(),
        };
        this.createServer = (handler) => {
            return https.createServer(options, handler);
        }
        this.port = parseInt(opts.options.port || "8443")
    } else {
        this.createServer = http.createServer;
        this.port = parseInt(opts.options.port || "8000")
    }

    return Promise.resolve();
}
ServePlugin.prototype.run = function() {
    let filename = this.filename;

    function handler(request, response) {
        let isSecure = !!request.connection.ssl;

        let url = parseUrl(request.url);

        function sendContent(content, contentType) {
            console.log("OK: " + content.length + ' bytes sent');
            response.writeHead(200, { "Content-Type": contentType });
            response.write(content);
            response.end();
        }

        function sendError(statusCode, reason) {
            console.log(reason + ": " + url.pathname);
            response.writeHead(statusCode, reason);
            response.end();
        }

        if (request.method === "GET" || request.method === "HEAD") {
            if (url.pathname !== '/') { return sendError(404, 'NOT FOUND'); }
            try {
                return sendContent(flatten(filename), 'text/html');
            } catch(error) {
                console.log(error);
                return sendError(500, 'SERVER ERROR');
            }
        } else {
            return sendError(400, 'Bad Request');
        }
    }

    return new Promise((resolve, reject) => {
        let server = this.createServer(handler);
        server.listen(this.port, () => {
            console.log("Listening on port " + this.port + "...");
        });
        process.on('SIGINT', function() {
            console.log("Shutting down...");
            server.close(() => {
                resolve();
            });
        });
    });
}
plugins['serve'] = new ServePlugin();


cli.run(options, plugins)
