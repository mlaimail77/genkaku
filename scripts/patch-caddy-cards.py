#!/usr/bin/env python3
"""Add the Agent Routes card registry to the seed host's Caddyfile.

Idempotent: a second run reports "already present" and changes nothing. The
block is inserted before the seed site's 404 fallback, which is the only
`respond "seed" 404` in the file.

    sudo python3 patch-caddy.py [--check]
"""
import sys

PATH = '/etc/caddy/Caddyfile'
NEEDLE = '\thandle {\n\t\trespond "seed" 404\n\t}'

BLOCK = '''\t# Agent Routes card registry: static, curated, public. handle_path strips
\t# /cards, so /cards/v1/index.json reads /srv/genkaku-cards/v1/index.json.
\t# Cards are data, not application state: no process needs to be restarted to
\t# publish one, and a bad file cannot take the ads or seed paths down.
\thandle_path /cards/* {
\t\theader Cache-Control "public, max-age=300"
\t\theader Access-Control-Allow-Origin "*"
\t\troot * /srv/genkaku-cards
\t\tfile_server
\t}

'''


def main() -> int:
    source = open(PATH, encoding='utf8').read()

    if 'handle_path /cards/*' in source:
        print('patch-caddy: already present')
        return 0

    if NEEDLE not in source:
        print('patch-caddy: the seed site block is not in the expected shape; nothing changed')
        return 1

    updated = source.replace(NEEDLE, BLOCK + NEEDLE, 1)

    if '--check' in sys.argv:
        print('patch-caddy: would insert the /cards block')
        return 0

    open(PATH, 'w', encoding='utf8').write(updated)
    print('patch-caddy: inserted the /cards block')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
