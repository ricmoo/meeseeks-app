Meeseeks App
============

**Note: This is EXPERIMENTAL**

The Meeseeks App Bootstrap is a static file designed to
safely verify and serve IPFS content fetched from an IPFS
API gateway, while preserving CORS and other Cross-Origin
Policy protections that modern browsers implement.

The Problem
-----------

The security provided from browsers is based (in large) by
placing all pages on a given domain name in the same bucket.
So, for example, when you visit *google.com(, all pages 
served from *google.com* have access to the cookies,
`window.localStorage` and the ability to load other content
from *google.com*.

Currently, many distributed Ethereum apps (dapps) and other
simple one-page web applications publish their content on IPFS
and link to `ipfs.infura.io` or `ipfs.io`. This means that an
application running on separate multihashes, share the same
local storage, for example.

How does it work
----------------

The Meeseeks App Bootstrap is a simple 4.5kb static file, which can
be served from a CDN. We provide an instance on *.meeseeks.app,
which can be used to access IPFS directly by a hex hash, or by an
ENS name. For example:

Name: https://pac-txt.meeseeks.app

Explicit Hash: https://0xbyeoujcyespi6jvo44vzlm44gocjvgjkh37ubpig2jwbegl233yw.meeseeks.app

The Process:

1. Convert the domain name to either an ENS name or a multihash
2. If it is an ENS name, resolve the text key **vnd.app.meeseeks** to a multihash
3. Fetch the multihash node and follow all links, stitching together the data, verifying the hash of each block
4. Using `document.open`, replace the current page DOM context with the HMTL downloaded from IPFS

About
-----

This was an entry from the 2018 #cryptolife Status Hackathon in
Prague, in which it won first for the Infrastructure Track.

The version in this repository has been largely refactored and
rewritten from the [version submitted](https://github.com/status-im/CryptoLife/tree/ricloo/project), bringing down the size
from 1.9MB to 4.5kb over-the-wire.

License
-------

MIT.
