#!/usr/bin/env python3
"""Stamp the build id into index.html, sw.js and version.json.
The id busts every asset URL (?v=), renames the service-worker cache (sq-<build>) and
version.json (never cached) tells a stale page to reload itself once.

  python3 dev/stamp.py        (run after EVERY edit, or browsers keep serving old code)
"""
import datetime, os, re, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    sha = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=ROOT).stdout.strip() or 'nogit'
    build = datetime.datetime.now().strftime('%Y%m%d-%H%M') + '-' + sha
    p = os.path.join(ROOT, 'index.html'); s = open(p, encoding='utf-8').read()
    s = re.sub(r'(name="build" content=")[^"]*(")', r'\g<1>' + build + r'\2', s)
    s = re.sub(r'\?v=[A-Za-z0-9.-]+', '?v=' + build, s)
    open(p, 'w', encoding='utf-8').write(s)
    p = os.path.join(ROOT, 'sw.js'); s = open(p, encoding='utf-8').read()
    s = re.sub(r"const CACHE = 'sq-[^']*'", "const CACHE = 'sq-" + build + "'", s)
    open(p, 'w', encoding='utf-8').write(s)
    open(os.path.join(ROOT, 'version.json'), 'w').write('{"build": "%s"}\n' % build)
    print('build', build)

if __name__ == '__main__':
    main()
