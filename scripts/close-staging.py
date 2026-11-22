#!/usr/bin/env python3
"""Close the staging preview site, keep the infrastructure paths.

The staging host does three jobs, and only one of them is a website:

  * the Next.js preview of the site            -> CLOSED (503)
  * the Docusaurus preview under /docs/        -> CLOSED (503)
  * seed discovery (/seed/*), the admin console (/admin*) and the plugin
    tarballs (/dl/*)                           -> still served

`seed.genkaku.app` is a separate site block and is untouched: the plugins fetch
the ad catalog and the card registry from it, and shutting it down would break
every installed plugin.

Idempotent: a second run reports "already closed".
"""
import sys

PATH = '/etc/caddy/Caddyfile'

CATCH_ALL = '''\thandle {
\t\ttry_files {path} {path}/ {path}/index.html {path}.html
\t\tfile_server
\t}
'''

DOCS = '''\thandle_path /docs/* {
\t\theader /assets/* Cache-Control "public, max-age=31536000, immutable"
\t\troot * /srv/genkaku-web3/current/docs
\t\ttry_files {path} {path}/ {path}/index.html {path}.html
\t\tfile_server
\t}

'''

CLOSED = '''\t# Staging preview closed on 2026-11-22. The site and the docs preview are
\t# off; seed discovery, the admin console and the plugin tarballs stay up
\t# because installed plugins and the production admin depend on them.
\thandle {
\t\theader Content-Type "text/html; charset=utf-8"
\t\theader Cache-Control "no-store"
\t\trespond `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>staging closed</title><body style="font:16px/1.6 -apple-system,Segoe UI,sans-serif;max-width:36em;margin:12vh auto;padding:0 1.5em;background:#0c0a09;color:#fff"><p style="letter-spacing:.12em;text-transform:uppercase;font-size:12px;opacity:.5">GenKaKu</p><h1 style="font-size:22px;font-weight:600">The staging preview is closed</h1><p style="opacity:.75">The live site is <a style="color:#80a0c1" href="https://genkaku.app/">genkaku.app</a>. The seed relay, the ad catalog and the card registry on <code>seed.genkaku.app</code> are unaffected.</p>` 503
\t}
'''


def main() -> int:
    source = open(PATH, encoding='utf8').read()

    if 'Staging preview closed on' in source:
        print('close-staging: already closed')
        return 0

    if CATCH_ALL not in source:
        print('close-staging: the staging catch-all is not in the expected shape; nothing changed')
        return 1

    updated = source.replace(CATCH_ALL, CLOSED, 1)

    # The docs preview is part of the site, not of the infrastructure.
    if DOCS in updated:
        updated = updated.replace(DOCS, '', 1)
    else:
        print('close-staging: warning: the /docs/ block was not found; leaving it')

    if '--check' in sys.argv:
        print('close-staging: would close the preview')
        return 0

    open(PATH, 'w', encoding='utf8').write(updated)
    print('close-staging: preview closed; /seed, /admin, /dl still served')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
