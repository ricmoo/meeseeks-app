Meeseeks App
============

**Note: This is EXPERIMENTAL**

The Meeseeks App Bootstrap is a static file designed to
safely verify and serve IPFS content fetched from an IPFS
API gateway, while preserving CORS and other Cross-Origin
Policy protections that modern browsers implement.

Quick Start
-----------

**Install Meeseeks CLI**
```
/home/ricmoo> npm install -g meeseeks-cli
```

**Publishing via multihash**

```
/home/ricmoo> echo "<html>One fish, Two fish...</html>" > test.html
/home/ricmoo> meeseeks publish test.html
Publishing:  test.html (35 bytes)
  Hash: QmWGC4PvneSHrPFRQ11aaaE4mac3aZJNqdKzLaytAs3XDn
  URL:  https://0xg5nzbhuxbzxg6jnyojr7eb6s7ziboo2a4n7753yrvbiouugs2pxn.meeseeks.app
```

You can use [meeseeks.app](https://meeseeks.app) to see your [new page](https://0xg5nzbhuxbzxg6jnyojr7eb6s7ziboo2a4n7753yrvbiouugs2pxn.meeseeks.app).

**Linking with ENS**

```
/home/ricmoo> meeseeks link fishbowl.eth QmWGC4PvneSHrPFRQ11aaaE4mac3aZJNqdKzLaytAs3XDn --account wallet.json
Password (0x18C6045651826824FEBBD39d8560584078d1b247):
Decrypting... 100%
Account #0: 0x18C6045651826824FEBBD39d8560584078d1b247
Linking:  fishbowl.eth  =>  QmWGC4PvneSHrPFRQ11aaaE4mac3aZJNqdKzLaytAs3XDn
Transaction:
  To:           0x5FfC014343cd971B7eb70732021E26C35B744cc4
  Gas Price:    3.0 gwei
  gas Limit:    500000
  Nonce:        549
  Data:         0x10f13a8ce864761fa296243b8698a0eb99827a9e9c9e4eff255663e97811d130347e0071000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000010766e642e6170702e6d65657365656b7300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e516d5747433450766e6553487250465251313161616145346d616333615a4a4e71644b7a4c61797441733358446e000000000000000000000000000000000000
  Value:        0.0 ether
Sign and Trasmit? [y/n/a] y
Sent Transaction:
   Hash:        0x3a5614987a92542b30af135a72917c3b1bbf87fd2a3cfe9b1bdfdec61820a328
```

And visit [fishbowl.meeseeks.app](https://fishbowl.meeseeks.app).
  

The Problem
-----------

The security provided from browsers is based (in large) by
placing all pages on a given domain name in the same bucket.
So, for example, when you visit *google.com*, all pages 
served from *google.com* have access to the cookies,
`window.localStorage` and the ability to load other content
from *google.com*.

Currently, many distributed Ethereum apps (dapps) and other
simple one-page web applications publish their content on IPFS
and link to `ipfs.infura.io` or `ipfs.io`. This means that an
application running on separate multihashes, share the same
local storage, for example.

How does Meeseeks work
----------------------

The Meeseeks App Bootstrap is a simple 5kb static file, which can
be served from a CDN. We provide an instance on *.meeseeks.app,
which can be used to access IPFS directly by a base32 hash, or by an
ENS name. For example:

Name: https://pac-txt.meeseeks.app

Base32 Hash: https://0xgbyeoujcyespi6jvo44vzlm44gocjvgjkh37ubpig2jwbegl233yw.meeseeks.app

The Process:

1. Convert the domain name to either an ENS name or a multihash
2. If it is an ENS name, resolve the text key **vnd.app.meeseeks** to a multihash
3. Fetch the multihash node and follow all links, stitching together the data, verifying the hash of each block
4. Using `document.open`, replace the current page DOM context with the HMTL downloaded from IPFS

About
-----

This was an entry from the [2018 #cryptolife Status Hackathon](https://cryptolife.devpost.com) in
Prague, in which it won first for the Infrastructure Track.

The version in this repository has been largely refactored and
rewritten from the [version submitted](https://github.com/status-im/CryptoLife/tree/ricloo/project), bringing down the size
from 1.9MB to 5kb over-the-wire.

FAQ
---

**Why do you use base32 hashes for the multihash?! Why not base58? Why not hex? Something normal?**

Unfortunately, the two obvious choices to be standard are technically impossible. A
Base58 encoded string may contain both lower-case and upper-case characters, and
domain names MUST be lower-case. On the other side of standard-encodings, the hex encoding
would put a multihash in at 64 bytes, and SSL certificates have a hard-limit of 63 bytes
per label. Of the available options, base32 seemed like the least non-standard we could use.

That said, we prefix all base32 hashes with `0xg`, since an ENS name should not start with
`0x` and the `g` provides us a version byte, so we can extend the `0x` space in the future.

**Can I just host the bootstrap myself? On my own domain?**

Absolutely! And you should feel free to do so. This will enable you to
serve IPFS content from your own CDN on your own domain, safely, since
all multihash contents are verified before being served.

For now you will need to tweak the code a bit in the index.html, but we will
provide better directions and make it easier in the non-distant future.

**But I have to trust your CDN?**

Yes, that's true. We highly recommend you host your own instance on a
domain you own for production. See the answer to the previous question.

That said, if you currently use *ipfs.io* or *ipfs.infura.io*, you are
trusting their gateway, since the content is not being verified by the
browser.

**Sub-sub-domains?**

Unfortunately, also not supported by SSL. We will have a useful solution in the
near future to make this easier to use for anyone that does not own a top-level
ENS name.

**Future?**

We consider this a stop-gap. In the future, we would love to see `ipfs://` supported
natively in the browser, at which time cross-origin policies can simply be applied
to the multihash.


License
-------

MIT.
