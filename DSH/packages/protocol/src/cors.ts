// GENKAKU: CORS for the local control planes.
//
// The bridge and the worker status server answer on 127.0.0.1 and used to send
// `access-control-allow-origin: *`. Any website the user visited could then
// read wallet state and, once wallet endpoints existed, key material. Now only
// the two hosts that actually render a panel may read these responses:
//
//   - the DSH web app served from loopback (`dsh web` in a browser), and
//   - the official DSH desktop app, whose renderer runs on `dsh-app://app`.
//     Chromium sends that origin on every cross-origin fetch, and the app's own
//     web route authenticates with the same string.
//
// `null` stays rejected. A sandboxed iframe on any website carries that origin,
// and file:// pages do too, so allowing it would hand every page the key
// material this gate exists to protect.

import type { IncomingMessage, ServerResponse } from 'node:http'

const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/

/** Origin of the official DSH desktop renderer (Electron custom scheme). */
const DESKTOP_APP = 'dsh-app://app'

/**
 * Apply CORS headers when the request comes from a host allowed to show a panel.
 * @returns false when a browser origin outside that set tried to call us.
 */
export function applyPanelCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin

  // curl, the HTML dashboard (same-origin navigation) and node clients send no
  // Origin; they are not subject to the browser's cross-origin rules.
  if (origin == null) return true

  if (!LOOPBACK.test(origin) && origin !== DESKTOP_APP) return false

  res.setHeader('access-control-allow-origin', origin)
  res.setHeader('vary', 'origin')
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')

  return true
}
