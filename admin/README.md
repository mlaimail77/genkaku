# @genkaku/admin

The seed VM control console. It answers under `/admin` and is expected to run
next to `@genkaku/seed` on the same machine, behind Caddy.

## What it shows

| Panel | Source |
| --- | --- |
| Workers (on-chain / announced) | WorkerRegistry logs, seed announcements |
| Users, sessions | distinct `user` addresses in `SessionOpened` |
| Settled / fee / refunded USDC | `SessionSettled` + `SessionRefunded` logs |
| Relay reservations / sessions | seed process (`relay:reservation`, relay map) |
| Clients (24 h) | seed peer discovery requests |
| Traffic bytes | seed process counters (`/proc/self/io`, Linux) |
| Traffic price and VM cost | its own state file, editable in the console |

The chain scan is cached for five minutes; the seed stats for three seconds.
A failure in either source shows a message instead of breaking the page.

## First sign-in

The initial password is `12345678`. Change it under **Settings** before the
console is exposed. The hash (scrypt) lives in `~/.genkaku-admin/admin.json`;
there is no recovery path, so keep a copy of that file if you need one.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `GENKAKU_ADMIN_PORT` | `8082` | HTTP port (bind loopback only) |
| `GENKAKU_ADMIN_HOST` | `127.0.0.1` | bind address |
| `GENKAKU_ADMIN_STATE` | `~/.genkaku-admin/admin.json` | password, pricing, baseline |
| `GENKAKU_SEED_STATS_URL` | `http://127.0.0.1:8081/stats` | seed stats endpoint |
| `GENKAKU_SEED_STATE_DIR` | `~/.genkaku-seed` | where the stats token lives |
| `GENKAKU_NET_ENV` | `base-sepolia` | chain whose escrow/registry are read |
| `GENKAKU_SEED_PUBLIC_URL` | `https://staging.genkaku.app/seed/peers` | link shown in the console |

## Run

```bash
pnpm --filter @genkaku/admin build
node packages/admin/dist/main.js
```

Both services on the seed VM:

```ini
# /etc/systemd/system/genkaku-seed.service
[Unit]
Description=GenKaKu seed (discovery + circuit relay)
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/genkaku-plugin/packages/seed
Environment=GENKAKU_SEED_PUBLIC=35.234.31.54
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
User=genkaku

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/genkaku-admin.service
[Unit]
Description=GenKaKu admin console
After=genkaku-seed.service

[Service]
WorkingDirectory=/opt/genkaku-plugin/packages/admin
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
User=genkaku

[Install]
WantedBy=multi-user.target
```

Caddy must keep the `/admin` prefix:

```caddyfile
handle /admin* {
	reverse_proxy 127.0.0.1:8082 {
		header_up X-Forwarded-For {remote_host}
	}
}
```

`/seed/*` is already proxied to `127.0.0.1:8081`; the seed's `/stats` route
requires the token in `~/.genkaku-seed/stats.token`, so it is not readable from
the public site.

## Security notes

- Password hashing: scrypt (N=16384 default), 16-byte salt, constant-time compare.
- Sessions: random 32-byte token, `HttpOnly; SameSite=Strict; Path=/admin`,
  12-hour lifetime, invalidated on password change.
- Six failed sign-ins per IP in ten minutes trigger a temporary lockout.
- POST endpoints require the `x-genkaku-admin: 1` header (CSRF defense on top of
  SameSite).
- No wallet keys, no seed private key, no signing. Read-only against the chain.
