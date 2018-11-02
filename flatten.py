#!/usr/bin/env python

import re
import subprocess
import zlib

html = open('index.html').read();

def repl(match):
    file('.tmp.js', 'w').write(match.group(1));
    script = subprocess.check_output(['./node_modules/.bin/uglifyjs', '-m', '--toplevel', '.tmp.js']).decode('utf8')
    return "<script>" + script + "</script>";

minified = re.sub("<script>(.*)</script>", repl, html, 1, re.DOTALL);

file('./dist/index.html', 'w').write(minified);

print "Original:", len(html)
print "Minified:", len(minified)
print "Comressed:", len(zlib.compress(minified))
