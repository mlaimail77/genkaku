// GENKAKU for dsh: OpenAI-compatible bridge (user side).
// The dsh agent loop talks plain OpenAI HTTP; this bridge dials a genkaku worker
// over libp2p and relays the stream. 0.3 moved the money off this path: a
// session costs the user nothing, so nothing is opened, settled or refunded
// here. What money remains is the tip the panel sends straight to a worker's
// wallet, and the sponsored placement whose impression pays for a minute.

import { randomBytes } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import type { Libp2p } from 'libp2p'

import { applyPanelCors } from './cors.ts'
import { runWalletAction, type WalletControl } from './walletControl.ts'
import { AD_MIN_GAP_MS, matchAd, type AdCreative, type AdImpression, type AdMode } from './ads.ts'
import type { AdFeed } from './adFeed.ts'

import {
  MAX_TIP_MICRO,
  publicClientFor,
  readWorker,
  signReceiptPayload,
  walletAddress,
  type GenkakuWallet,
} from './chain.ts'
import { dialWorkerAny, fetchOffers, pairWithWorker, requestSettle } from './dial.ts'
import type { ChatMessage } from './llmBridge.ts'
import type { ModeManager, RoleMode } from './modeManager.ts'
import type { NetEnvironment } from './netconfig.ts'
import {
  dedupeOffers,
  modelKeyOf,
  toWire,
  type Offer,
  type OfferSortKey,
} from './offer.ts'
import { decodePairingToken, tokenAddrs } from './privacy.ts'
import { bindingOf, peerIdOf, walletOfPeerId } from './registry.ts'
import type { Digest } from './receipts.ts'
import {
  MAX_SELECTED_MODELS,
  MODEL_SORT_KEYS,
  patchUserPrefs,
  removePrivatePeer,
  sanitizeUserPrefs,
  type ModelSortKey,
  type PrivatePeer,
  type UserPrefs,
} from './userPrefs.ts'
import {
  readTeamConfig,
  readTeamDecisions,
  sanitizeRoute,
  teamCatalogProvider,
  writeTeamConfig,
  type TeamAgent,
  type TeamCatalog,
  type TeamConfig,
  type TeamRoute,
} from './team.ts'
import {
  addCards,
  cardFromAgent,
  decodeShare,
  encodeShare,
  previewAgentId,
  readAnyCardDocument,
  readCardLibrary,
  removeCard,
  resolveCard,
  sanitizeCard,
  sanitizePack,
  shareUrl,
  type AgentCard,
  type AgentPack,
} from './teamCards.ts'
import {
  appendAdviceMessage,
  clearAdviceThread,
  readAdviceThread,
  teamAdvisor,
  teamUsage,
  type AdviceOutput,
  type TeamAdvisor,
} from './teamAdvice.ts'
import { runUserSession } from './userSession.ts'
import type { WalletPolicy } from './walletPolicy.ts'

/** JSON served by GET /genkaku/status and rendered by GET /genkaku. */
export type BridgeStatus = {
  role: string
  workers: string[]
  wallet: string
  offers: Array<{
    addr: string
    offer: ReturnType<typeof toWire>
    /** the (worker, model) id the chat picker sends back */
    key: string
    visibility: 'public' | 'private'
    /** the user's label for a private worker */
    workerLabel?: string
    online: boolean
  }>
  url: string
  /** addr → the path its last session took: direct libp2p or the seed relay. */
  transports?: Record<string, 'direct' | 'relay'>
  /** chat-picker whitelist; the bridge seeds the top ten on first run */
  selected?: string[]
  /** false until the picker's list has been materialised once */
  seeded?: boolean
  sort?: ModelSortKey
  maxSelected?: number
  privatePeers?: Array<{
    wallet: string
    peerId: string
    label?: string
    /** null until the first probe answers */
    online: boolean | null
    pairedAt: number
  }>
  /** 0.3: whether sponsored placements are being served, and how fresh that
   *  answer is. Absent on a bridge without an ad feed. */
  ads?: AdMode
  /** Agent Routes: whether the team is on, so the panel can paint the header
   *  without a second request. The full config lives on /genkaku/team. */
  team?: {
    enabled: boolean
    mode: TeamConfig['mode']
    agents: number
    main: TeamRoute | null
  }
}

export type BridgeOptions = {
  workers: string[]
  port: number
  env: NetEnvironment
  modeManager: ModeManager
  getNode: () => Promise<Libp2p>
  userKey: () => GenkakuWallet
  log: (line: string) => void
  /** optional extra fields merged over the base status JSON (dashboard extension hook) */
  /** Relay hops to fall back to once a direct dial keeps failing. */
  getRelays?: () => Promise<string[]>
  status?: (base: BridgeStatus) => Record<string, unknown> | Promise<Record<string, unknown>>
  /** optional live mode switch from POST /genkaku/mode */
  onMode?: (mode: RoleMode) => void | Promise<void>
  /** Persist the panel's settings edits (the worker list) into the plugin's
   *  settings document. The runtime applies them by restarting the bridge. */
  onSettings?: (patch: { workers?: string[] }) => void | Promise<void>
  /** Re-run discovery. The worker set is read at startup, so the host restarts
   *  its half; this callback returns before that happens (the reply must land). */
  onRefresh?: () => void | Promise<void>
  /** Wallet operations the panel drives. Key material only ever leaves over
   *  the panel CORS gate, and only after an explicit confirmation flag. */
  wallet?: WalletControl
  /** Marketplace prefs: the chat-picker whitelist and the list order. */
  prefs?: () => UserPrefs
  /** Persist a prefs edit. No bridge restart: selection is local state. */
  onPrefs?: (patch: { selected?: string[]; sort?: ModelSortKey; seeded?: boolean }) => void | Promise<void>
  /** Workers this user paired with a one-time code. */
  privatePeers?: () => PrivatePeer[]
  /** Persist the paired-worker list after a pairing or an unpair. */
  onPrivatePeers?: (next: PrivatePeer[]) => void | Promise<void>
  /** Agent Routes: cloud providers the host has already configured in dsh.
   *  The bridge never sees an API key; it only lists routes. */
  teamCatalog?: () => Promise<{ providers: TeamCatalog['providers'] }>
  /** Agent Routes: the host's model call behind the setup advisor. Registered
   *  by the user plugin, because `protocol` has no LLM dependency. */
  teamAdvisor?: TeamAdvisor
  /** Origin used for the share link a card produces. */
  shareOrigin?: string
  /** Where `policy.json` and `spend.jsonl` live (the same `~/.dsh/genkaku`). */
  keyDir: string
  /** 0.3: the sponsored-placement catalog. Absent = this bridge serves no ads. */
  ads?: AdFeed
  /** 0.3: send a tip from this profile's wallet to a worker. Absent = no tips. */
  tip?: (input: { to: string; micro: bigint }) => Promise<string>
  /** 0.4: the ads service, for self-serve listings. */
  adsServiceUrl?: string
  /** 0.5: what an agent may do with this wallet. */
  walletPolicy?: WalletPolicy
  /** The token an agent must present on /genkaku/agent/wallet. */
  agentToken?: string
  /** 0.4: fund a listing from this profile's wallet and read its balance. */
  adCampaign?: {
    /** Create + fund a campaign and return its address. */
    create: (input: {
      index: number
      priceMicro: bigint
      budgetMicro: bigint
      minClaimMicro: bigint
    }) => Promise<{ campaign: string; tx: string }>
    /** Unspent micro-USDC, read from the campaign account. */
    remaining: (campaign: string) => Promise<bigint>
    /** The first unused campaign index for this wallet. */
    index: () => Promise<number>
    pause: (campaign: string, paused: boolean) => Promise<string>
    withdraw: (campaign: string) => Promise<{ tx: string; amount: string }>
    state: (campaign: string) => Promise<{ paused: boolean; withdrawable: string; remaining: string }>
  }
}

export type BridgeHandle = {
  url: string
  close: () => Promise<void>
}

type ChatBody = {
  model?: string
  stream?: boolean
  max_tokens?: number
  max_completion_tokens?: number
  messages?: Array<{
    role?: string
    content?: unknown
    tool_calls?: unknown
    tool_call_id?: string
  }>
  /** JSON schemas the model may call; forwarded to the worker verbatim. */
  tools?: unknown[]
}

const OFFERS_TTL_MS = 10_000

/** Background probe interval for paired private workers. */
const PRIVATE_PROBE_MS = 20_000
/** How long the status page may reuse the last board before refreshing it.
 *  Dialing a worker costs seconds when it is down; a poll must not pay that. */
const BOARD_REFRESH_MS = 5_000
/** Ceiling for one request's completion length; the hourly quote bounds cost. */
const MAX_COMPLETION_TOKENS = 4096
const SSE_TAIL = String.fromCharCode(10, 10)
const SSE_DONE = 'data: ' + String.fromCharCode(91, 68, 79, 78, 69, 93) + SSE_TAIL

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(part => (typeof part === 'object' && part !== null && (part as { type?: string }).type === 'text'
      ? String((part as { text?: unknown }).text ?? '')
      : ''))
    .join('')
}

async function readJson<T = unknown>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += (chunk as Buffer).length
    if (bytes > 4 * 1024 * 1024) throw new Error('request body too large')
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as T
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

/** Map a worker refusal to the HTTP status the caller should see. Payment
 *  problems are 402 (retry after funding); verification/connectivity are 503
 *  (retry shortly); anything else stays a generic failure. */
function refusalStatus(code: string | undefined): number {
  switch (code) {
    case 'payment-required':
    case 'unknown-session':
    case 'wrong-worker':
    case 'closed-session':
    case 'empty-session':
    case 'bad-session':
    case 'underpriced':
    case 'budget_exhausted':
    case 'policy_disabled':
    case 'policy_expired':
    case 'price_cap':
    case 'session_cap':
      return 402
    case 'chain-unavailable':
    case 'paywall-error':
      return 503
    default:
      // No code means the worker itself was unreachable (dial/stream error).
      return 502
  }
}

function failure(res: ServerResponse, status: number, message: string): void {
  json(res, status, { error: { message, type: 'invalid_request_error' } })
}

/** A refusal the client can branch on: the spending policy names its reason. */
async function adsJson(
  base: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; doc: any }> {
  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    signal: AbortSignal.timeout(20_000),
  })

  const doc = await res.json().catch(() => ({}))

  return { status: res.status, doc }
}

/** Turn the program's custom error codes into something a person can act on.
 *  The RPC message is a log dump; the code is the one useful part. */
function chainHint(message: string): string {
  if (message.includes('custom program error: 0xd')) {
    return 'the campaign must stay paused for a full day before its budget can be withdrawn'
  }
  if (message.includes('custom program error: 0x1c')) {
    return 'this accrual is below the campaign\'s claim threshold'
  }
  if (message.includes('custom program error: 0x1d')) {
    return 'the campaign does not have enough unspent budget'
  }
  if (message.includes('custom program error: 0x1')) {
    return 'the wallet does not have enough SOL or USDC for this transaction'
  }

  return message
}

function failureWithCode(res: ServerResponse, status: number, code: string, message: string): void {
  json(res, status, { error: { message, type: 'invalid_request_error', code } })
}

const DEBUG_LOG = '/tmp/genkaku-bridge.log'

/** Dev diagnostics: one line per request/error; logging never fails the request. */
function debugLog(line: string): void {
  try {
    appendFileSync(DEBUG_LOG, new Date().toISOString() + ' ' + line + String.fromCharCode(10))
  } catch {
    // best effort
  }
}

/** Self-contained status dashboard: no external assets, polls /genkaku/status. */
const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GENKAKU bridge</title>
<style>
body{font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:24px;background:#0b0d10;color:#d7dde5}
h1{font-size:18px;margin:0 0 16px}
.m{color:#7d8794;font-weight:400}
.card{border:1px solid #222832;border-radius:8px;padding:12px;margin:12px 0;background:#11151b}
b{color:#7d8794;font-weight:500;text-transform:uppercase;font-size:11px;letter-spacing:.08em;display:block;margin-bottom:4px}
table{border-collapse:collapse;width:100%}
td,th{text-align:left;padding:4px 8px;border-bottom:1px solid #1c222b}
th{color:#7d8794;font-weight:500}
.actions{display:flex;gap:8px;flex-wrap:wrap}
button{background:#1b2330;color:#d7dde5;border:1px solid #2a323d;border-radius:4px;padding:4px 10px;cursor:pointer}
</style>
</head>
<body>
<h1>GENKAKU <span class="m">bridge</span></h1>
<div id="root">loading...</div>
<script>
var e=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
function usdc(v){var n=Number(v);return isFinite(n)?(n/1e6).toFixed(2):e(v)}
function short(v){v=String(v||'');return v.length>12?v.slice(0,6)+'...'+v.slice(-4):v}
function card(label,value){return '<div class="card"><b>'+label+'</b>'+e(value)+'</div>'}
function switchMode(mode){
  fetch('/genkaku/mode',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:mode})})
    .then(function(res){return res.json().then(function(body){return {ok:res.ok,body:body}})})
    .then(function(r){
      if(!r.ok||!r.body.ok){throw new Error((r.body.error&&r.body.error.message)||'mode switch failed')}
      setTimeout(function(){location.reload()},2000);
    })
    .catch(function(err){alert('Mode switch failed: '+(err&&err.message?err.message:String(err)))});
}
function roleRow(role){
  return '<div class="card"><b>role: '+e(role)+'</b><div class="actions">'
    +'<button type="button" data-mode="user">user</button>'
    +'<button type="button" data-mode="localPlusSharing">localPlusSharing</button>'
    +'<button type="button" data-mode="workerDedicated">workerDedicated</button>'
    +'</div></div>';
}
document.addEventListener('click',function(ev){
  var t=ev.target;
  if(t&&t.getAttribute&&t.getAttribute('data-mode')){switchMode(t.getAttribute('data-mode'))}
});
async function load(){
  var root=document.getElementById('root');
  try{
    var res=await fetch('/genkaku/status',{cache:'no-store'});
    var s=await res.json();
    var rows=(s.offers||[]).map(function(r){var o=r.offer||{};return '<tr><td>'+e(o.model)+'</td><td>'+e(o.workerName)+'</td><td>'+usdc(o.pricePerHour)+'</td><td>'+e(o.creditScore)+'</td><td>'+e(short(o.workerWallet))+'</td><td>'+e(r.addr)+'</td></tr>'}).join('');
    var table='<div class="card"><b>offers</b><table><tr><th>model</th><th>worker</th><th>USDC/hour</th><th>credit</th><th>wallet</th><th>peer</th></tr>'+(rows||'<tr><td colspan="6">no offers</td></tr>')+'</table></div>';
    root.innerHTML=roleRow(s.role)+card('bridge url',s.url)+card('wallet',s.wallet)+card('workers',(s.workers||[]).join(', '))+table;
  }catch(err){
    root.innerHTML='<div class="card">status unavailable: '+e(err&&err.message?err.message:String(err))+'</div>';
  }
}
load();
setInterval(load,5000);
</script>
</body>
</html>`

/** One marketplace row after public and private boards are merged. */
type BoardRow = {
  addr: string
  offer: Offer
  /** stable id of the (worker, model) pair the chat picker sends back */
  key: string
  visibility: 'public' | 'private'
  /** the user's label for a private worker */
  workerLabel?: string
  online: boolean
}

/** `agent` models first, then light, then chat-only: the recommendation is the
 *  order that produces a usable agent out of the box. */
function tierRank(tier: string | undefined): number {
  return tier === 'agent' ? 0 : tier === 'light' ? 1 : 2
}

function compareBig(a: bigint, b: bigint): number {
  return a === b ? 0 : a < b ? -1 : 1
}

/** Order the network list. Unknown latency sorts last, never first. */
function sortRows(rows: BoardRow[], sort: ModelSortKey): BoardRow[] {
  const name = (row: BoardRow): string => row.workerLabel ?? row.offer.workerName
  const latency = (row: BoardRow): number => row.offer.latencyMs ?? Number.POSITIVE_INFINITY

  const compare = (a: BoardRow, b: BoardRow): number => {
    switch (sort) {
      case 'pricePerHour':
        return compareBig(a.offer.pricePerHour, b.offer.pricePerHour)
      case 'latencyMs':
        return latency(a) - latency(b)
      case 'sessionsServed':
        return b.offer.sessionsServed - a.offer.sessionsServed
      case 'model':
        return a.offer.model.localeCompare(b.offer.model)
      case 'workerName':
        return name(a).localeCompare(name(b))
      case 'recommended':
      default:
        return tierRank(a.offer.tier) - tierRank(b.offer.tier)
          || compareBig(a.offer.pricePerHour, b.offer.pricePerHour)
          || latency(a) - latency(b)
    }
  }

  return [...rows].sort((a, b) =>
    compare(a, b)
    || name(a).localeCompare(name(b))
    || a.offer.model.localeCompare(b.offer.model)
    || a.key.localeCompare(b.key))
}

export async function startOpenAiBridge(opts: BridgeOptions): Promise<BridgeHandle> {
  const cache = new Map<string, { at: number; offers: Offer[] }>()
  const transports = new Map<string, 'direct' | 'relay'>()
  let bridgeUrl = ''
  let prefs = sanitizeUserPrefs(opts.prefs?.() ?? {})
  /** Paired workers are probed in the BACKGROUND: a status poll must never
   *  wait on a dial timeout, or the panel reads "unreachable" for a machine
   *  that is merely slow. */
  let privateCache: { at: number; rows: BoardRow[]; online: Map<string, boolean> } | null = null
  let refreshingPrivate = false
  /**
   * 0.3 placement state.
   *
   * One decision per distinct turn: the bridge sees every prompt, so matching
   * happens here and the panel only has to render what was decided. Two gates
   * keep it from becoming wallpaper — never the first exchange, and never more
   * often than the rotation interval.
   */
  let turnCount = 0
  let lastPrompt = ''
  let lastPlacementAt = 0
  let lastCreativeId: string | undefined
  /** Which worker served the placement's turn. Filled in once the dial succeeds:
   *  that wallet is the one an impression pays, so it must be observed, not
   *  guessed from the picker. */
  let placement: { creative: AdCreative; turn: number; at: number; worker?: string } | null = null
  /** Random per bridge run. Lets the ads service dedupe a re-reported impression
   *  without learning anything about the conversation — it never leaves as an id
   *  a user could be tracked by. */
  const runId = randomBytes(8).toString('hex')

  // Warm the catalog at boot: the panel and /genkaku/status then report the
  // service's real mode instead of "paused" until the first eligible turn,
  // and the first placement does not wait on a network round trip.
  void opts.ads?.catalog()

  async function offerPlacement(text: string): Promise<void> {
    if (opts.ads == null) return
    // Agent loops re-send the same prompt with tool results; those are
    // continuations of one turn, not new turns.
    if (text === lastPrompt) return
    lastPrompt = text
    turnCount += 1

    // A placement belongs to the turn that produced it. The next prompt ends
    // it, so the card never lingers under an older answer while the user is
    // already reading a newer one.
    placement = null

    if (turnCount < 2) return
    if (Date.now() - lastPlacementAt < AD_MIN_GAP_MS) return

    const catalog = await opts.ads.catalog()
    const found = matchAd(catalog, text, lastCreativeId)
    if (found == null) return

    lastPlacementAt = Date.now()
    lastCreativeId = found.creative.id
    placement = { creative: found.creative, turn: turnCount, at: lastPlacementAt }
  }

  async function refreshPrivate(): Promise<void> {
    if (refreshingPrivate) return
    const peers = opts.privatePeers?.() ?? []

    if (peers.length === 0) {
      privateCache = { at: Date.now(), rows: [], online: new Map() }

      return
    }

    refreshingPrivate = true

    try {
      const node = await opts.getNode()
      const relays = opts.getRelays == null ? [] : await opts.getRelays().catch(() => [])
      const rows: BoardRow[] = []
      const online = new Map<string, boolean>()

      await Promise.all(peers.map(async (peer) => {
        const label = peer.label ?? peer.name
        const addrs = tokenAddrs(peer, relays)

        for (const addr of addrs) {
          try {
            const board = await fetchOffers(node, addr)

            // A private worker answers an unpaired dial with an EMPTY board, so
            // an empty answer means "refused", not "online with no models".
            // Try the peer's other addresses instead of presenting it as up.
            if (board.length === 0) throw new Error('the worker served no offers (unpaired, or nothing listed)')

            rows.push(...board.map(offer => ({
              addr,
              offer,
              // The paired wallet is authoritative even when the board omits
              // it; without that, two private workers could collide on a key.
              key: modelKeyOf(peer.wallet, offer.model),
              visibility: 'private' as const,
              online: true,
              ...(label == null ? {} : { workerLabel: label }),
            })))
            online.set(peer.wallet, true)

            return
          } catch {
            // Try the next address: a worker that moved is still paired.
          }
        }

        online.set(peer.wallet, false)
      }))

      privateCache = { at: Date.now(), rows, online }
    } catch (error) {
      opts.log(`private workers: probe failed (${error instanceof Error ? error.message : String(error)})`)
    } finally {
      refreshingPrivate = false
    }
  }

  async function offersOf(addr: string): Promise<Offer[]> {
    const hit = cache.get(addr)
    if (hit != null && Date.now() - hit.at < OFFERS_TTL_MS) return hit.offers
    const node = await opts.getNode()
    const offers = await fetchOffers(node, addr)
    cache.set(addr, { at: Date.now(), offers })
    return offers
  }

  async function board(): Promise<BoardRow[]> {
    // One dial per PEER, not per address. The chain directory and the seed can
    // both list the same worker (a LAN address plus a relay circuit), and
    // dialing those in parallel makes libp2p race itself — both attempts then
    // time out. Try the peer's addresses in order, direct first, and stop at
    // the first board that answers.
    const peers = new Map<string, string[]>()
    for (const addr of opts.workers) {
      const key = peerIdOf(addr) ?? addr
      const list = peers.get(key)
      if (list == null) peers.set(key, [addr])
      else if (!list.includes(addr)) list.push(addr)
    }

    const rows = await Promise.all([...peers.values()].map(async (addrs) => {
      const ordered = [...addrs].sort((a, b) =>
        Number(a.includes('/p2p-circuit')) - Number(b.includes('/p2p-circuit')))

      for (const addr of ordered) {
        try {
          return (await offersOf(addr)).map(offer => ({
            addr,
            offer,
            key: modelKeyOf(offer.workerWallet ?? peerIdOf(addr) ?? addr, offer.model),
            visibility: 'public' as const,
            online: true,
          }))
        } catch (error) {
          opts.log(`offers: ${addr} unreachable (${error instanceof Error ? error.message : String(error)})`)
        }
      }
      return [] as BoardRow[]
    }))

    // Private rows go first so a paired worker keeps its label when the same
    // wallet is ALSO still visible through a stale public listing.
    const seen = new Set<string>()
    const merged: BoardRow[] = []

    for (const row of [...(privateCache?.rows ?? []), ...dedupeOffers(rows.flat()).map(row => ({
      addr: row.addr,
      offer: row.offer,
      key: modelKeyOf(row.offer.workerWallet ?? peerIdOf(row.addr) ?? row.addr, row.offer.model),
      visibility: 'public' as const,
      online: true,
    }))]) {
      if (seen.has(row.key)) continue
      seen.add(row.key)
      merged.push(row)
    }

    return merged
  }

  /**
   * The board, as of a few seconds ago.
   *
   * `status` is what the panel polls, and `board()` dials every worker whose
   * offer cache expired — up to a dial timeout each, per peer, on a worker that
   * went away. That is seconds of waiting on a request whose only job is to say
   * what the bridge already knows. So the status route reads this snapshot and
   * a refresh runs behind it; the next poll sees the result.
   */
  let boardCache: { at: number; rows: BoardRow[] } | null = null
  let refreshingBoard = false

  async function refreshBoard(): Promise<void> {
    if (refreshingBoard) return
    refreshingBoard = true
    try {
      boardCache = { at: Date.now(), rows: await board() }
    } catch (error) {
      opts.log(`board: refresh failed (${error instanceof Error ? error.message : String(error)})`)
    } finally {
      refreshingBoard = false
    }
  }

  function boardNow(): BoardRow[] {
    if (boardCache == null || Date.now() - boardCache.at > BOARD_REFRESH_MS) void refreshBoard()
    return boardCache?.rows ?? []
  }

  /**
   * What the panel and the advisor both see: cloud routes the host reports,
   * plus the live local board. Built on demand, so a worker that comes online
   * appears without a restart and an empty board is an honest empty list.
   */
  async function readTeamCatalog(): Promise<TeamCatalog> {
    let providers: TeamCatalog['providers'] = []
    // The user plugin registers this in-process provider on start; the option
    // exists for hosts that prefer to pass it explicitly.
    const catalog = opts.teamCatalog ?? teamCatalogProvider()
    if (catalog != null) {
      try {
        providers = (await catalog()).providers
      } catch {
        providers = []
      }
    }

    const local: TeamCatalog['local'] = []
    const seen = new Set<string>()
    for (const row of boardNow()) {
      const model = row.offer.model
      if (model == null || model === '') continue
      if (seen.has(row.key)) continue
      seen.add(row.key)
      const worker = row.workerLabel ?? row.offer.workerName
      local.push({
        id: row.key,
        name: `${worker == null || worker === '' ? row.addr.slice(0, 8) : worker} · ${model}`,
        ...(worker == null || worker === '' ? {} : { worker }),
        ...(row.offer.workerWallet == null ? {} : { workerWallet: row.offer.workerWallet }),
        ...(row.offer.tier == null ? {} : { tier: row.offer.tier }),
        pricePerHour: row.offer.pricePerHour.toString(),
        ...(row.offer.latencyMs == null ? {} : { latencyMs: row.offer.latencyMs }),
        ...(row.offer.parameterSize == null ? {} : { parameterSize: row.offer.parameterSize }),
      })
    }

    return { providers, local }
  }

  const models = async (res: ServerResponse): Promise<void> => {
    // A paired worker that moved is worth one synchronous retry: the picker is
    // the only way to pick the model, so serving a stale empty list is worse
    // than a slow answer.
    if ((opts.privatePeers?.() ?? []).length > 0 && privateCache == null) await refreshPrivate()

    const rows = await board()
    const sorted = sortRows(rows, prefs.sort)

    // First run: fill the picker with the ten best rows ONCE, so the plugin is
    // usable before anyone opens the panel. After that the list is exactly what
    // the user ticked — including empty, which is a real choice.
    if (prefs.seeded !== true && sorted.length > 0) {
      const seed = sorted.slice(0, MAX_SELECTED_MODELS).map(row => row.key)
      prefs = patchUserPrefs(prefs, { selected: seed })
      await opts.onPrefs?.({ selected: prefs.selected, seeded: true })
    }

    const selected = new Set(prefs.selected)
    const chosen = sorted.filter(row => selected.has(row.key))

    const data = chosen.map(row => {
      const offer = row.offer
      const tier = offer.tier ?? 'chat'

      return {
        id: row.key,
        object: 'model' as const,
        created: 0,
        owned_by: 'genkaku',
        // Non-standard, ignored by OpenAI clients and read by our selector.
        genkaku: {
          tier,
          capabilities: offer.capabilities ?? [],
          ...(offer.parameterSize === undefined ? {} : { parameterSize: offer.parameterSize }),
          workerName: row.workerLabel ?? offer.workerName,
          ...(offer.workerWallet === undefined ? {} : { workerWallet: offer.workerWallet }),
          pricePerHour: offer.pricePerHour.toString(),
          sessionsServed: offer.sessionsServed,
          visibility: row.visibility,
          ...(offer.latencyMs === undefined ? {} : { latencyMs: offer.latencyMs }),
          model: offer.model,
        },
      }
    })

    json(res, 200, { object: 'list', data })
  }

  const status = async (res: ServerResponse): Promise<void> => {
    const { mode } = opts.modeManager.current()
    const rows = sortRows(boardNow(), prefs.sort)
    // 0.3 ranks by the reputation the worker published, not by an escrow-derived
    // credit score: there is no escrow to derive one from.
    const offers = rows.map((row) => {
      return {
        addr: row.addr,
        offer: toWire(row.offer),
        key: row.key,
        visibility: row.visibility,
        ...(row.workerLabel == null ? {} : { workerLabel: row.workerLabel }),
        online: row.online,
      }
    })
    const peers = opts.privatePeers?.() ?? []
    const team = readTeamConfig(opts.keyDir)
    const base: BridgeStatus = {
      role: mode,
      workers: opts.workers,
      wallet: walletAddress(opts.userKey()),
      offers,
      url: bridgeUrl,
      selected: prefs.selected,
      seeded: prefs.seeded === true,
      sort: prefs.sort,
      maxSelected: MAX_SELECTED_MODELS,
      privatePeers: peers.map(peer => ({
        wallet: peer.wallet,
        peerId: peer.peerId,
        pairedAt: peer.pairedAt,
        ...((peer.label ?? peer.name) == null ? {} : { label: peer.label ?? peer.name }),
        // `undefined` reads as "not probed yet"; `false` is a real offline.
        online: privateCache?.online.get(peer.wallet) ?? null,
      })),
      ...(opts.ads == null ? {} : { ads: opts.ads.snapshot() }),
      ...(transports.size === 0 ? {} : { transports: Object.fromEntries(transports) }),
      team: {
        enabled: team.enabled,
        mode: team.mode,
        agents: team.agents.length,
        main: team.main,
      },
    }
    const extra = opts.status == null ? undefined : await opts.status(base)
    json(res, 200, extra == null ? base : { ...base, ...extra })
  }

  const dashboard = (res: ServerResponse): void => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(DASHBOARD_HTML)
  }

  const chat = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const body = await readJson<ChatBody>(req)
    debugLog('chat body=' + JSON.stringify(body))
    const model = typeof body.model === 'string' ? body.model : ''
    debugLog('chat model=' + (model === '' ? '(none)' : model))
    const messages = Array.isArray(body.messages) ? body.messages : []
    const system = textOf(messages.find(m => m.role === 'system')?.content)
    const prompt = messages
      .filter(m => m.role === 'user')
      .map(m => textOf(m.content))
      .filter(text => text !== '')
      .join('\n')
    if (prompt === '') return failure(res, 400, 'no user message')

    // Matching runs here, on the machine that already has the text. The result
    // is picked up by the composer dock; nothing about the prompt is sent out.
    void offerPlacement(prompt)

    // A request that carries tool schemas, or whose history already contains
    // tool calls/results, needs the chat revision: the single-prompt form would
    // silently drop the very thing an agent turn depends on.
    const needsChat = Array.isArray(body.tools) && body.tools.length > 0
      || messages.some(m => m.role === 'tool' || Array.isArray(m.tool_calls))
    const conversation: ChatMessage[] | undefined = needsChat
      ? messages
          .filter(m => m.role === 'system' || m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
          .map(m => ({
            role: m.role as ChatMessage['role'],
            content: textOf(m.content),
            ...(Array.isArray(m.tool_calls) ? { tool_calls: m.tool_calls } : {}),
            ...(typeof m.tool_call_id === 'string' ? { tool_call_id: m.tool_call_id } : {}),
          }))
      : undefined

    let rows = await board()
    let picked = rows.find(row => row.key === model)
      ?? rows.find(row => row.offer.model === model)
      ?? (rows.length === 1 ? rows[0] : undefined)

    // A model id from the picker names one (worker, model) pair. If it is not
    // in the cached board, the paired worker may have just come online.
    if (picked == null && (opts.privatePeers?.() ?? []).length > 0) {
      await refreshPrivate()
      rows = await board()
      picked = rows.find(row => row.key === model) ?? rows.find(row => row.offer.model === model)
    }

    if (picked == null) return failure(res, 404, `model "${model}" is not offered by any configured worker`)

    if (picked.offer.workerWallet != null && picked.offer.workerWallet !== '') {
      const wallet = picked.offer.workerWallet
      const peerId = peerIdOf(picked.addr)
      const proven = picked.offer.walletVerified === true

      try {
        // The address's own PeerId encodes the key that owns the wallet, so a
        // mismatch here is not an unproven claim — it is a contradiction.
        const embedded = peerId == null ? null : walletOfPeerId(peerId)

        if (embedded != null && embedded !== wallet) {
          opts.log(`identity: ${picked.addr} is peer ${embedded}, not wallet ${wallet}`)
          return failure(res, 403, `worker at ${picked.addr} does not own wallet ${wallet}`)
        }

        const record = await readWorker(publicClientFor(opts.env), opts.env, wallet)
        const binding = peerId == null ? 'absent' : bindingOf(record, peerId)

        if (binding === 'mismatch') {
          opts.log(`registry: ${wallet} is bound to a different peer than ${picked.addr}`)
          return failure(res, 403, `worker wallet ${wallet} is not bound to ${picked.addr}; refusing to start the session`)
        }

        // P4.9e: the hello handshake proves key possession directly. Without
        // it the on-chain binding is the only evidence — and it is a claim the
        // wallet made, not proof that this peer holds the key. A paid session
        // (real escrow) requires one of the two.
        // Proof still matters in 0.3, for a different reason: a sponsored minute
        // is paid to the wallet a worker publishes, so a peer that cannot prove
        // it holds that key would be collecting someone else's money.
        if (binding !== 'bound' && !proven) {
          opts.log(`identity: ${wallet} at ${picked.addr} is neither proven nor bound — refusing the session`)
          return failure(res, 403, `could not verify that ${picked.addr} controls wallet ${wallet}`)
        }

        if (binding !== 'bound' && !proven) {
          opts.log(`registry: ${wallet} has no active binding yet — continuing under testnet grace (unpaid)`)
          debugLog('registry absent wallet=' + wallet + ' addr=' + picked.addr)
        }

        debugLog(`identity: wallet=${wallet} proven=${proven} binding=${binding}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        opts.log(`registry: ${wallet} check failed (${message}) — continuing under testnet grace`)
      }
    }

    const node = await opts.getNode()
    const relays = opts.getRelays == null ? [] : await opts.getRelays().catch(() => [])
    const dialed = await dialWorkerAny(node, picked.addr, { relays })
    const transport = dialed.transport
    transports.set(picked.addr, dialed.route)
    if (dialed.route === 'relay') {
      opts.log(`transport: ${picked.addr} reached through the seed relay`)
    }

    // The placement for this turn now has a worker: the wallet that answered is
    // the one an impression pays. Recorded here rather than at match time,
    // because at match time nobody had been chosen yet.
    if (placement != null && placement.turn === turnCount && placement.worker == null) {
      const servedBy = picked.offer.workerWallet
      if (servedBy != null && servedBy !== '') placement = { ...placement, worker: servedBy }
    }
    const jobId = `dsh-${Date.now().toString(36)}`
    const created = Math.floor(Date.now() / 1000)
    const id = `chatcmpl-${jobId}`
    const sse = body.stream !== false
    // Cost is bounded by the hourly quote, not by starving the completion: an
    // agent needs room for a tool call and a short answer. 4096 is the ceiling
    // any single request may ask for.
    const maxTokens = Math.min(
      typeof body.max_tokens === 'number' ? body.max_tokens
        : typeof body.max_completion_tokens === 'number' ? body.max_completion_tokens
          : 1024,
      MAX_COMPLETION_TOKENS,
    )
    // 0.3: a session is free. Nothing is opened before the dial and nothing is
    // settled after it; the only money this path can move is a tip the user
    // sends deliberately from the panel.
    // Headers are written lazily, on the first byte the worker actually sends:
    // a paywall refusal must be an HTTP error with a JSON body, not a 200 SSE
    // stream that ends with no content (P4.9d).
    let streamStarted = false
    const startStream = (): void => {
      if (!sse || streamStarted || res.destroyed) return
      streamStarted = true
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      })
      res.write(`data: ${JSON.stringify({
        id, object: 'chat.completion.chunk', created, model: picked.key,
        choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
      })}\n\n`)
    }

    const writeChunk = (delta: Record<string, unknown>, finish: string | null, usage?: Record<string, number>): void => {
      if (!sse || res.destroyed) return
      startStream()
      const chunk: Record<string, unknown> = {
        id, object: 'chat.completion.chunk', created, model: picked.key,
        choices: [{ index: 0, delta, finish_reason: finish }],
      }
      if (usage != null) chunk.usage = usage
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    }

    let receiptHash: Digest | null = null
    let sawToolCall = false
    const toolCalls: Array<{ index: number; id: string; name: string; arguments: string }> = []
    let content = ''
    const abort = (): void => { if (!res.writableEnded) void transport.close() }
    // res, not req: IncomingMessage 'close' fires once the body is consumed.
    res.on('close', abort)

    try {
      const result = await runUserSession({
        jobId,
        offer: picked.offer,
        prompt,
        system: system === '' ? undefined : system,
        maxTokens,
        ...(conversation === undefined ? {} : { messages: conversation }),
        ...(body.tools === undefined ? {} : { tools: body.tools }),
        transport,
        modeManager: opts.modeManager,
        env: opts.env,
        signReceipt: async receipt => await signReceiptPayload(opts.userKey(), receipt),
        emit: (event) => {
          if (event.type === 'token') {
            content += event.delta
            writeChunk({ content: event.delta }, null)
          } else if (event.type === 'tool-delta') {
            sawToolCall = true
            const existing = toolCalls.find(call => call.index === event.index)
            if (existing == null) {
              toolCalls.push({ index: event.index, id: event.id, name: event.name, arguments: event.argumentsDelta })
            } else {
              existing.arguments += event.argumentsDelta
            }
            writeChunk({
              tool_calls: [{
                index: event.index,
                id: event.id,
                type: 'function',
                function: { name: event.name, arguments: event.argumentsDelta },
              }],
            }, null)
          } else if (event.type === 'receipt-sent') {
            receiptHash = event.receiptHash as Digest
          } else if (event.type === 'session-error') {
            opts.log(`session ${jobId}: ${event.message}`)
          }
        },
      })

      if (result.failure != null) {
        // The worker refused before answering (paywall, closed escrow, …).
        // Nothing has been streamed yet, so this is still a clean HTTP error.
        failure(res, refusalStatus(result.failure.code), result.failure.message)
        return
      }

      const usage = {
        prompt_tokens: Math.ceil(prompt.length / 4),
        completion_tokens: result.tokens,
        total_tokens: Math.ceil(prompt.length / 4) + result.tokens,
      }

      if (sse) {
        writeChunk({}, sawToolCall ? 'tool_calls' : 'stop', usage) // finish
        res.write(SSE_DONE)
        res.end()
      } else {
        json(res, 200, {
          id,
          object: 'chat.completion',
          created,
          model: picked.key,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content,
              ...(toolCalls.length === 0 ? {} : {
                tool_calls: toolCalls.map(call => ({
                  id: call.id,
                  type: 'function',
                  function: { name: call.name, arguments: call.arguments },
                })),
              }),
            },
            finish_reason: sawToolCall ? 'tool_calls' : 'stop',
          }],
          usage,
        })
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined
      debugLog('chat error: ' + message)
      opts.log('session ' + jobId + ': ' + message)

      if (!res.headersSent) {
        failure(res, refusalStatus(code), message)
      } else if (!res.writableEnded) {
        res.end()
      }
    } finally {
      res.off('close', abort)
    }
  }

  const server = createServer((req, res) => {
    void (async () => {
      try {
        const path = (req.url ?? '/').split('?')[0] ?? '/'

        if (!applyPanelCors(req, res)) {
          res.writeHead(403, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'origin not allowed' } }))
          return
        }

        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/mode' || path === '/genkaku/mode/')) {
          if (opts.onMode == null) {
            failure(res, 501, 'mode switching is not enabled')
            return
          }
          let body: { mode?: unknown }
          try {
            body = await readJson<{ mode?: unknown }>(req)
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          const mode = body.mode
          if (mode !== 'user' && mode !== 'localPlusSharing' && mode !== 'workerDedicated') {
            failure(res, 400, 'mode must be one of user, localPlusSharing, workerDedicated')
            return
          }
          await opts.onMode(mode)
          json(res, 200, { ok: true })
          return
        }

        // ── 0.5 agent wallet policy ────────────────────────────────────────
        // Owner surface: choose the mode, read the queue, approve one request.
        if (opts.walletPolicy != null
          && req.method === 'GET' && (path === '/genkaku/wallet/policy' || path === '/genkaku/wallet/policy/')) {
          json(res, 200, { ok: true, ...opts.walletPolicy.snapshot() })
          return
        }

        if (opts.walletPolicy != null
          && req.method === 'POST' && (path === '/genkaku/wallet/policy' || path === '/genkaku/wallet/policy/')) {
          const body = await readJson<Record<string, unknown>>(req)
          try {
            if (typeof body.mode === 'string') opts.walletPolicy.setMode(body.mode)
            if (typeof body.frozen === 'boolean') opts.walletPolicy.setFrozen(body.frozen)
            if (body.perTxMicro != null || body.dailyMicro != null) {
              opts.walletPolicy.setCaps({ perTxMicro: body.perTxMicro, dailyMicro: body.dailyMicro })
            }
            json(res, 200, { ok: true, ...opts.walletPolicy.snapshot() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (opts.walletPolicy != null
          && req.method === 'POST' && (path === '/genkaku/wallet/approve' || path === '/genkaku/wallet/approve/')) {
          const body = await readJson<Record<string, unknown>>(req)
          try {
            const request = opts.walletPolicy.approve(String(body.id ?? ''))
            json(res, 200, { ok: true, request, policy: opts.walletPolicy.snapshot() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (opts.walletPolicy != null
          && req.method === 'POST' && (path === '/genkaku/wallet/deny' || path === '/genkaku/wallet/deny/')) {
          const body = await readJson<Record<string, unknown>>(req)
          try {
            const request = opts.walletPolicy.deny(String(body.id ?? ''))
            json(res, 200, { ok: true, request, policy: opts.walletPolicy.snapshot() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        // Agent surface. A token identifies the agent; without it this route is
        // closed. The token is not a sandbox (same OS user can read it) — the
        // approval queue, not the token, is what protects a large amount.
        if (req.method === 'POST' && (path === '/genkaku/agent/wallet' || path === '/genkaku/agent/wallet/')) {
          if (opts.walletPolicy == null || opts.agentToken == null) {
            failure(res, 501, 'agent wallet access is not enabled on this bridge')
            return
          }
          if (req.headers['x-genkaku-agent-token'] !== opts.agentToken) {
            failure(res, 401, 'agent token is missing or wrong')
            return
          }
          const body = await readJson<Record<string, unknown>>(req)
          const action = String(body.action ?? '')

          try {
            if (action === 'tip') {
              const to = typeof body.to === 'string' ? body.to.trim() : ''
              const micro = BigInt(String(body.micro ?? '0'))
              if (to === '' || micro <= 0n || micro > MAX_TIP_MICRO) throw new Error('invalid tip')
              if (opts.tip == null) throw new Error('tipping is not enabled on this bridge')

              const payload = { to, micro: micro.toString() }
              const summary = `Tip ${(Number(micro) / 1e6).toFixed(4)} USDC to ${to}`
              const approvalId = typeof body.approvalId === 'string' ? body.approvalId : ''

              if (approvalId !== '') {
                opts.walletPolicy.takeApproval({ id: approvalId, action: 'tip', amountMicro: micro, payload })
              } else {
                const decision = opts.walletPolicy.authorize({ actor: 'agent', action: 'tip', amountMicro: micro, summary, payload })
                if (decision.status === 'deny') return failure(res, 403, decision.reason)
                if (decision.status === 'pending') {
                  json(res, 202, { ok: false, status: 'pending', request: decision.request })
                  return
                }
              }

              const signature = await opts.tip({ to, micro })
              opts.walletPolicy.recordSpend(micro)
              if (approvalId !== '') opts.walletPolicy.complete(approvalId, signature)
              json(res, 200, { ok: true, signature, micro: micro.toString(), to })
              return
            }

            if (action === 'campaign-fund') {
              if (opts.adCampaign == null) throw new Error('advertising is not enabled on this bridge')
              const index = Number(body.index)
              const price = BigInt(String(body.priceMicro ?? '0'))
              const budget = BigInt(String(body.budgetMicro ?? '0'))
              const requestedMinClaim = BigInt(String(body.minClaimMicro ?? '30000'))
              // A threshold above the whole budget can never be reached. Keep
              // every API-created campaign payable once it is spent.
              const minClaim = requestedMinClaim > budget ? budget : requestedMinClaim
              if (!Number.isInteger(index) || index < 0 || price <= 0n || budget < price) throw new Error('invalid campaign funding')

              const payload = {
                index,
                priceMicro: price.toString(),
                budgetMicro: budget.toString(),
                minClaimMicro: minClaim.toString(),
              }
              const summary = `Fund campaign #${index} with ${(Number(budget) / 1e6).toFixed(2)} USDC at ${(Number(price) / 1e6).toFixed(4)}/impression`
              const approvalId = typeof body.approvalId === 'string' ? body.approvalId : ''

              if (approvalId !== '') {
                opts.walletPolicy.takeApproval({ id: approvalId, action: 'campaign-fund', amountMicro: budget, payload })
              } else {
                const decision = opts.walletPolicy.authorize({ actor: 'agent', action: 'campaign-fund', amountMicro: budget, summary, payload })
                if (decision.status === 'deny') return failure(res, 403, decision.reason)
                if (decision.status === 'pending') {
                  json(res, 202, { ok: false, status: 'pending', request: decision.request })
                  return
                }
              }

              const made = await opts.adCampaign.create({
                index,
                priceMicro: price,
                budgetMicro: budget,
                minClaimMicro: minClaim,
              })
              opts.walletPolicy.recordSpend(budget)
              if (approvalId !== '') opts.walletPolicy.complete(approvalId, made.tx)
              json(res, 200, { ok: true, ...made })
              return
            }

            // Identity and key operations are never available to an agent.
            failure(res, 403, 'that wallet action is owner-only')
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (typeof body.approvalId === 'string' && body.approvalId !== '') opts.walletPolicy.fail(body.approvalId, message)
            failure(res, 400, message)
          }
          return
        }

        if (req.method === 'POST' && path.startsWith('/genkaku/wallet/')) {
          const action = path.slice('/genkaku/wallet/'.length).replace(/\/$/, '')
          if (opts.wallet == null) {
            failure(res, 501, 'wallet operations are not enabled in this role')
            return
          }

          let body: Record<string, unknown> = {}
          try {
            body = await readJson(req) as Record<string, unknown>
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }

          const reply = await runWalletAction(action, body, opts.wallet)
          if (reply.status === 200 && action === 'export') res.setHeader('cache-control', 'no-store')
          json(res, reply.status, reply.doc)
        }

        if (req.method === 'POST' && (path === '/genkaku/pair' || path === '/genkaku/pair/')) {
          let body: { token?: unknown; label?: unknown }
          try {
            body = await readJson(req) as typeof body
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (typeof body.token !== 'string' || body.token.trim() === '') {
            failure(res, 400, 'token must be a pairing code')
            return
          }

          let token: ReturnType<typeof decodePairingToken>
          try {
            token = decodePairingToken(body.token)
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
            return
          }

          const existing = (opts.privatePeers?.() ?? []).find(peer => peer.wallet === token.wallet)
          if (existing != null) {
            json(res, 200, { ok: true, alreadyPaired: true, wallet: token.wallet, peerId: token.peerId })
            return
          }

          const node = await opts.getNode()
          const relays = opts.getRelays == null ? [] : await opts.getRelays().catch(() => [])
          const addrs = tokenAddrs(token, relays)
          if (addrs.length === 0) {
            failure(res, 409, 'this pairing code carries no reachable address; ask the worker for a fresh code')
            return
          }

          let lastReason = 'the worker was not reachable'
          for (const addr of addrs) {
            if (peerIdOf(addr) !== token.peerId) continue
            try {
              const result = await pairWithWorker(
                node,
                addr,
                token.secret,
                typeof body.label === 'string' ? body.label : undefined,
              )
              if (!result.ok) {
                // A refusal is final (wrong/expired/used code), not a transport
                // failure: retrying the other addresses cannot help.
                failure(res, 400, result.reason)
                return
              }
              if (result.wallet !== token.wallet) {
                failure(res, 409, 'the worker answered with a different wallet than the code names')
                return
              }

              const label = typeof body.label === 'string' && body.label.trim() !== ''
                ? body.label.trim()
                : token.name
              const peer: PrivatePeer = {
                wallet: result.wallet,
                peerId: token.peerId,
                pairedAt: Date.now(),
                name: token.name,
                label,
                addrs: token.addrs,
                relay: token.relay,
              }
              const next = sanitizeUserPrefs({
                ...prefs,
                privatePeers: [...(opts.privatePeers?.() ?? []).filter(row => row.wallet !== peer.wallet), peer],
              })
              prefs = next
              await opts.onPrivatePeers?.(next.privatePeers)
              await refreshPrivate()
              // The panel reloads as soon as this reply lands: refresh the
              // snapshot now, or it would show the pre-pairing board for up to
              // BOARD_REFRESH_MS and look like the code did nothing.
              await refreshBoard()
              json(res, 200, { ok: true, wallet: peer.wallet, peerId: peer.peerId, label: peer.label })
              return
            } catch (error) {
              lastReason = error instanceof Error ? error.message : String(error)
            }
          }

          failure(res, 502, `pairing failed: ${lastReason}`)
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/unpair' || path === '/genkaku/unpair/')) {
          let body: { wallet?: unknown }
          try {
            body = await readJson(req) as typeof body
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (typeof body.wallet !== 'string' || body.wallet === '') {
            failure(res, 400, 'wallet must be a base58 address')
            return
          }
          const next = removePrivatePeer(prefs, body.wallet)
          prefs = next
          await opts.onPrivatePeers?.(next.privatePeers)
          await refreshPrivate()
          await refreshBoard()
          json(res, 200, { ok: true, removed: body.wallet })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/settings' || path === '/genkaku/settings/')) {
          let body: { workers?: unknown; refresh?: unknown; selected?: unknown; sort?: unknown }
          try {
            body = await readJson(req) as typeof body
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }

          if (body.refresh === true) {
            // Drop the 10s offer cache, then ask the host to re-read the chain
            // directory and the seed. Clearing the cache alone only re-dialed
            // the workers we already knew about.
            cache.clear()
            transports.clear()
            privateCache = null
            void refreshPrivate()
            if (opts.onRefresh != null) {
              try {
                await opts.onRefresh()
              } catch (error) {
                opts.log(`refresh: restart refused (${error instanceof Error ? error.message : String(error)})`)
              }
            }
          }

          const patch: { workers?: string[] } = {}
          const prefsPatch: { selected?: string[]; sort?: ModelSortKey } = {}

          if (body.selected !== undefined) {
            if (!Array.isArray(body.selected) || body.selected.some(key => typeof key !== 'string')) {
              failure(res, 400, 'selected must be an array of model keys')
              return
            }
            if (body.selected.length > MAX_SELECTED_MODELS) {
              failure(res, 400, `at most ${MAX_SELECTED_MODELS} models may be selected`)
              return
            }
            prefsPatch.selected = body.selected as string[]
          }

          if (body.sort !== undefined) {
            if (!MODEL_SORT_KEYS.includes(body.sort as ModelSortKey)) {
              failure(res, 400, `sort must be one of ${MODEL_SORT_KEYS.join(', ')}`)
              return
            }
            prefsPatch.sort = body.sort as ModelSortKey
          }

          if (body.workers !== undefined) {
            if (!Array.isArray(body.workers)) {
              failure(res, 400, 'workers must be an array of multiaddrs')
              return
            }
            const workers = body.workers
              .filter((w): w is string => typeof w === 'string')
              .map(w => w.trim())
              .filter(w => w.startsWith('/'))
            if (workers.length !== body.workers.length || workers.length > 16 || workers.some(w => w.length > 512)) {
              failure(res, 400, 'each worker must be a multiaddr (max 16)')
              return
            }
            patch.workers = workers
          }

          if (Object.keys(patch).length > 0) {
            if (opts.onSettings == null) {
              failure(res, 501, 'settings are not writable in this profile')
              return
            }
            await opts.onSettings(patch)
          }

          if (Object.keys(prefsPatch).length > 0) {
            prefs = patchUserPrefs(prefs, prefsPatch)
            await opts.onPrefs?.(prefsPatch)
          }

          json(res, 200, {
            ok: true,
            applied: [...Object.keys(patch), ...Object.keys(prefsPatch)],
            refreshed: body.refresh === true,
            selected: prefs.selected,
            sort: prefs.sort,
          })
          return
        }

        // ── Agent Routes ────────────────────────────────────────────────────
        // The panel edits one JSON file; the adapter reads the same file, so a
        // save takes effect without a bridge restart. The catalog is assembled
        // from what this bridge already knows (local offers) plus the cloud
        // routes the host reports. API keys never enter this response.
        if (req.method === 'GET' && (path === '/genkaku/team' || path === '/genkaku/team/')) {
          const catalog = await readTeamCatalog()
          const config = readTeamConfig(opts.keyDir)
          json(res, 200, {
            ok: true,
            config,
            decisions: readTeamDecisions(opts.keyDir),
            usage: teamUsage(config, readTeamDecisions(opts.keyDir)),
            catalog,
          })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/team' || path === '/genkaku/team/')) {
          let body: { config?: unknown }
          try {
            body = await readJson<{ config?: unknown }>(req)
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          const config = writeTeamConfig(opts.keyDir, body.config)
          json(res, 200, {
            ok: true,
            config,
            decisions: readTeamDecisions(opts.keyDir),
          })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/team/decisions/clear' || path === '/genkaku/team/decisions/clear/')) {
          try {
            writeFileSync(join(opts.keyDir, 'team-decisions.json'), '[]\n', { mode: 0o600 })
          } catch {
            // The log is diagnostics; a read-only directory is not a request error.
          }
          json(res, 200, { ok: true })
          return
        }

        // ── Agent Routes: the card library ─────────────────────────────────
        // Cards are an inbox, not the live team: importing one writes
        // `cards.json` and returns an install preview. Nothing joins the team
        // until the panel saves it, so a pasted file cannot change behaviour
        // by itself.
        if (req.method === 'GET' && (path === '/genkaku/team/cards' || path === '/genkaku/team/cards/')) {
          const library = readCardLibrary(opts.keyDir)
          const catalog = await readTeamCatalog()
          const taken = new Set(readTeamConfig(opts.keyDir).agents.map(agent => agent.id))
          const previews = library.cards.map((row) => {
            const id = previewAgentId(row.card, taken)
            taken.add(id)
            return { libraryId: row.id, ...resolveCard(row.card, catalog, id) }
          })
          json(res, 200, { ok: true, library, previews })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/team/cards' || path === '/genkaku/team/cards/')) {
          let body: {
            code?: unknown
            card?: unknown
            pack?: unknown
            document?: unknown
            source?: unknown
            remove?: unknown
            save?: unknown
          }
          try {
            body = await readJson(req)
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }

          if (typeof body.remove === 'string' && body.remove !== '') {
            json(res, 200, { ok: true, library: removeCard(opts.keyDir, body.remove) })
            return
          }

          let source = typeof body.source === 'string' ? body.source.slice(0, 80) : 'paste'
          const cards: AgentCard[] = []
          if (typeof body.code === 'string' && body.code.trim() !== '') {
            const decoded = decodeShare(body.code)
            if (decoded == null) {
              failure(res, 400, 'that is not a GenKaKu card code')
              return
            }
            cards.push(...decoded.cards)
            source = 'code'
          }
          for (const value of [body.card, body.pack, body.document]) {
            if (value == null) continue
            cards.push(...readAnyCardDocument(value).cards)
          }
          if (cards.length === 0) {
            failure(res, 400, 'no specialist card found in that document')
            return
          }

          const catalog = await readTeamCatalog()
          const taken = new Set(readTeamConfig(opts.keyDir).agents.map(agent => agent.id))
          const previews = []
          for (const card of cards) {
            const id = previewAgentId(card, taken)
            taken.add(id)
            previews.push(resolveCard(card, catalog, id))
          }
          // `save: false` is a preview: the advisor's suggestion is resolved
          // without joining the library, which is what "apply" needs and what
          // keeps the library from filling with ideas the user rejected.
          const keep = body.save !== false
          const library = keep
            ? addCards(opts.keyDir, cards, source).library
            : readCardLibrary(opts.keyDir)
          json(res, 200, { ok: true, saved: keep, library, previews })
          return
        }
        // Sharing needs the bridge only because the payload is gzipped: the
        // panel hands over a card object it already has, so an unsaved draft
        // can be shared without first saving it.
        if (req.method === 'POST' && (path === '/genkaku/team/cards/share' || path === '/genkaku/team/cards/share/')) {
          let body: {
            card?: unknown
            agent?: unknown
            cards?: unknown
            name?: unknown
            description?: unknown
            policy?: unknown
            lang?: unknown
          }
          try {
            body = await readJson(req)
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }

          let value: AgentCard | AgentPack | null = null
          if (Array.isArray(body.cards)) {
            value = sanitizePack({
              genkaku: 'agent-pack/1',
              name: body.name,
              description: body.description,
              cards: body.cards,
              policy: body.policy,
            })
          } else if (body.agent != null) {
            // Sharing a specialist the user wrote in the panel: the bridge owns
            // the route→hint conversion, so the two sides cannot drift.
            const agent = body.agent as Partial<TeamAgent> | null
            const route = sanitizeRoute(agent?.route)
            if (agent != null && route != null) {
              value = cardFromAgent(
                {
                  id: typeof agent.id === 'string' ? agent.id : '',
                  name: typeof agent.name === 'string' ? agent.name : '',
                  whenToUse: typeof agent.whenToUse === 'string' ? agent.whenToUse : '',
                  whenNotToUse: typeof agent.whenNotToUse === 'string' ? agent.whenNotToUse : '',
                  examples: Array.isArray(agent.examples) ? agent.examples.filter((row): row is string => typeof row === 'string') : [],
                  route,
                  systemPrompt: typeof agent.systemPrompt === 'string' ? agent.systemPrompt : '',
                  maxTokens: typeof agent.maxTokens === 'number' ? agent.maxTokens : 2_000,
                },
                { lang: typeof body.lang === 'string' ? body.lang : '' },
              )
            }
          } else {
            value = sanitizeCard(body.card)
          }
          if (value == null) {
            failure(res, 400, 'nothing to share: no valid card in the request')
            return
          }

          try {
            const code = encodeShare(value)
            json(res, 200, {
              ok: true,
              card: value,
              code,
              url: shareUrl(code, opts.shareOrigin),
              bytes: code.length,
            })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        // ── Agent Routes: the setup advisor ────────────────────────────────
        if (req.method === 'GET' && (path === '/genkaku/team/advice' || path === '/genkaku/team/advice/')) {
          const thread = readAdviceThread(opts.keyDir)
          // Resolve the newest answer so a reloaded panel can still say which
          // model each suggestion would run on.
          const last = [...thread.messages].reverse().find(message => message.role === 'advisor')
          const previews = []
          if (last?.cards != null && last.cards.length > 0) {
            const catalog = await readTeamCatalog()
            const taken = new Set(readTeamConfig(opts.keyDir).agents.map(agent => agent.id))
            for (const card of last.cards) {
              const id = previewAgentId(card, taken)
              taken.add(id)
              previews.push(resolveCard(card, catalog, id))
            }
          }
          json(res, 200, { ok: true, thread, previews })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/team/advice/clear' || path === '/genkaku/team/advice/clear/')) {
          json(res, 200, { ok: true, thread: clearAdviceThread(opts.keyDir) })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/team/advice' || path === '/genkaku/team/advice/')) {
          let body: { mode?: unknown; question?: unknown; agentId?: unknown; locale?: unknown }
          try {
            body = await readJson(req)
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }

          const run = opts.teamAdvisor ?? teamAdvisor()
          if (run == null) {
            failure(res, 503, 'the setup advisor is not loaded; restart the plugin')
            return
          }

          const mode = body.mode === 'review' || body.mode === 'rewrite' ? body.mode : 'advise'
          const question = typeof body.question === 'string' ? body.question.slice(0, 4_000) : ''
          const agentId = typeof body.agentId === 'string' ? body.agentId.slice(0, 32) : undefined
          const locale = typeof body.locale === 'string' ? body.locale.slice(0, 16) : 'en'

          const config = readTeamConfig(opts.keyDir)
          const catalog = await readTeamCatalog()
          const history = readAdviceThread(opts.keyDir).messages.map(message => ({
            role: message.role,
            text: message.text,
          }))

          // The panel closing is a real cancellation: a local worker spends
          // real wall-clock time on this, and nobody is waiting for the answer.
          const controller = new AbortController()
          res.on('close', () => {
            if (!res.writableEnded) controller.abort()
          })
          const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(180_000)])

          let output: AdviceOutput
          try {
            output = await run({ mode, question, agentId, locale, config, catalog, history, signal })
          } catch (error) {
            output = {
              reply: '',
              cards: [],
              model: null,
              ms: 0,
              error: error instanceof Error ? error.message : String(error),
            }
          }

          appendAdviceMessage(opts.keyDir, {
            role: 'user',
            at: Date.now(),
            text: question,
          })
          const thread = appendAdviceMessage(opts.keyDir, {
            role: 'advisor',
            at: Date.now(),
            text: output.reply === '' && output.error != null ? output.error : output.reply,
            ...(output.cards.length === 0 ? {} : { cards: output.cards }),
            ...(output.model == null ? {} : { model: output.model }),
          })

          if (output.error != null && output.reply === '') {
            failure(res, 502, output.error)
            return
          }

          const previews = []
          if (output.cards.length > 0) {
            const taken = new Set(config.agents.map(agent => agent.id))
            for (const card of output.cards) {
              const id = previewAgentId(card, taken)
              taken.add(id)
              previews.push(resolveCard(card, catalog, id))
            }
          }

          json(res, 200, {
            ok: true,
            reply: output.reply,
            cards: output.cards,
            previews,
            model: output.model,
            ms: output.ms,
            thread,
          })
          return
        }

        // ── 0.3 sponsored placements ────────────────────────────────────────
        // The prompt is matched HERE and never leaves the machine: the reply
        // carries a creative and nothing about the text that selected it.
        if (req.method === 'POST' && (path === '/genkaku/ad' || path === '/genkaku/ad/')) {
          if (opts.ads == null) {
            json(res, 200, { ad: null, mode: 'paused', revision: '', endpoint: null })
            return
          }
          const body = await readJson<{ text?: unknown; avoid?: unknown }>(req)
          const catalog = await opts.ads.catalog()
          const found = matchAd(
            catalog,
            typeof body.text === 'string' ? body.text.slice(0, 20_000) : '',
            typeof body.avoid === 'string' ? body.avoid : undefined,
          )

          json(res, 200, {
            ad: found?.creative ?? null,
            hits: found?.hits ?? 0,
            mode: catalog.mode,
            revision: catalog.revision,
            endpoint: opts.ads.endpoint,
          })
          return
        }

        // An impression is counted locally first: the ads service may be down
        // and the operator still wants yesterday's number.
        if (req.method === 'POST' && (path === '/genkaku/ad/impression' || path === '/genkaku/ad/impression/')) {
          const body = await readJson<{
            creativeId?: unknown
            category?: unknown
            session?: unknown
            turnsSince?: unknown
          }>(req)
          const creativeId = typeof body.creativeId === 'string' ? body.creativeId.trim().slice(0, 64) : ''

          if (creativeId === '') {
            failure(res, 400, 'creativeId is required')
            return
          }

          const impression: AdImpression = {
            at: Date.now(),
            creativeId,
            category: typeof body.category === 'string' ? body.category.slice(0, 32) : '',
            // Both of these are the bridge's, not the panel's: the run id is
            // random per process (dedupe without tracking) and the worker is the
            // wallet that actually served the turn (payment without guessing).
            session: runId,
            ...(placement?.worker == null ? {} : { worker: placement.worker }),
            ...(typeof body.turnsSince === 'number' && Number.isFinite(body.turnsSince)
              ? { turnsSince: body.turnsSince }
              : {}),
          }

          try {
            appendFileSync(join(opts.keyDir, 'ads.jsonl'), JSON.stringify(impression) + String.fromCharCode(10))
          } catch (error) {
            opts.log(`ads: could not record impression (${error instanceof Error ? error.message : String(error)})`)
          }

          // Fire and forget: a turn must never wait on the ad service.
          void opts.ads?.record(impression)
          json(res, 200, { recorded: true })
          return
        }

        if (req.method === 'GET' && (path === '/genkaku/ads' || path === '/genkaku/ads/')) {
          const mode = opts.ads?.snapshot() ?? { mode: 'paused' as const, revision: '', fetchedAt: 0, stale: false }

          json(res, 200, { ...mode, endpoint: opts.ads?.endpoint ?? null })
          return
        }

        // The dock reads this: the placement the bridge already decided on when
        // the turn's prompt arrived. No text goes in, so no prompt goes out.
        if (req.method === 'GET' && (path === '/genkaku/ad' || path === '/genkaku/ad/')) {
          const mode = opts.ads?.snapshot() ?? { mode: 'paused' as const, revision: '', fetchedAt: 0, stale: false }
          const live = mode.mode === 'active' && placement != null

          json(res, 200, {
            ad: live ? placement!.creative : null,
            turn: placement?.turn ?? 0,
            ...mode,
          })
          return
        }

        // ── 0.3 tips ───────────────────────────────────────────────────────
        // A tip is a direct SPL transfer from this wallet to the worker's. The
        // platform is not a party to it, so there is no fee and no custody.
        if (req.method === 'POST' && (path === '/genkaku/tip' || path === '/genkaku/tip/')) {
          if (opts.tip == null) {
            failure(res, 501, 'tipping is not enabled on this bridge')
            return
          }
          const body = await readJson<{ worker?: unknown; micro?: unknown; usdc?: unknown }>(req)
          const to = typeof body.worker === 'string' ? body.worker.trim() : ''
          const raw = typeof body.micro === 'string'
            ? body.micro
            : typeof body.micro === 'number' ? String(body.micro)
              : typeof body.usdc === 'number' ? String(Math.round(body.usdc * 1e6))
                : ''

          if (to === '' || raw === '') {
            failure(res, 400, 'worker and micro are required')
            return
          }

          let micro: bigint
          try {
            micro = BigInt(raw)
          } catch {
            failure(res, 400, 'micro must be an integer string')
            return
          }

          if (micro <= 0n || micro > MAX_TIP_MICRO) {
            failure(res, 400, `a tip must be between 1 and ${MAX_TIP_MICRO} micro-USDC`)
            return
          }

          try {
            if (opts.walletPolicy != null) {
              const decision = opts.walletPolicy.authorize({
                actor: 'owner',
                action: 'tip',
                amountMicro: micro,
                summary: `Owner tip ${(Number(micro) / 1e6).toFixed(2)} USDC`,
                payload: { to, micro: micro.toString() },
              })
              if (decision.status === 'deny') {
                failure(res, 403, decision.reason)
                return
              }
            }

            const signature = await opts.tip({ to, micro })

            opts.log(`tip: ${micro} micro-USDC → ${to} (${signature})`)
            json(res, 200, { signature, worker: to, micro: micro.toString() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        // ── 0.4 self-serve advertising ─────────────────────────────────────
        // The panel creates a listing, funds a campaign from its own wallet,
        // then attaches the address. Every money step signs locally; the ads
        // service never sees a key.
        if (req.method === 'GET' && (path === '/genkaku/ads/mine' || path === '/genkaku/ads/mine/')) {
          const wallet = opts.wallet?.address()
          if (wallet == null || opts.adsServiceUrl == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }

          try {
            const { status, doc } = await adsJson(opts.adsServiceUrl, `/listing?wallet=${encodeURIComponent(wallet)}`)
            if (status !== 200) {
              failure(res, status, doc?.error?.message ?? 'the ads service refused the request')
              return
            }

            const listings = Array.isArray(doc.listings) ? doc.listings : []
            for (const row of listings) {
              if (typeof row.campaign !== 'string' || opts.adCampaign == null) continue
              const state = await opts.adCampaign.state(row.campaign).catch(() => null)
              const left = state == null
                ? await opts.adCampaign.remaining(row.campaign).catch(() => 0n)
                : BigInt(state.remaining)
              row.remainingMicro = left.toString()
              row.spent = left < BigInt(String(row.priceMicro ?? '0'))
              row.paused = state?.paused === true
              row.withdrawableMicro = state?.withdrawable ?? left.toString()
            }

            json(res, 200, { ok: true, wallet, testMode: doc.testMode === true, listings })
          } catch (error) {
            failure(res, 502, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (req.method === 'GET' && (path === '/genkaku/ads/categories' || path === '/genkaku/ads/categories/')) {
          if (opts.adsServiceUrl == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          try {
            const { status, doc } = await adsJson(opts.adsServiceUrl, '/catalog')
            if (status !== 200) {
              failure(res, status, 'the ads service refused the catalog')
              return
            }
            json(res, 200, { ok: true, categories: Array.isArray(doc.categories) ? doc.categories : [] })
          } catch (error) {
            failure(res, 502, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (req.method === 'GET' && (path === '/genkaku/ads/index' || path === '/genkaku/ads/index/')) {
          if (opts.adCampaign == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          try {
            json(res, 200, { ok: true, index: await opts.adCampaign.index() })
          } catch (error) {
            failure(res, 500, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/ads/listing' || path === '/genkaku/ads/listing/')) {
          if (opts.adsServiceUrl == null || opts.wallet == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          const body = await readJson<Record<string, unknown>>(req)
          const priceMicro = String(body.priceMicro ?? '')
          if (!/^\d+$/.test(priceMicro) || BigInt(priceMicro) < 100n || BigInt(priceMicro) > 100_000n) {
            failure(res, 400, 'priceMicro must be between 100 and 100000')
            return
          }

          try {
            const { status, doc } = await adsJson(opts.adsServiceUrl, '/listing', {
              method: 'POST',
              body: { ...body, advertiser: opts.wallet.address() },
            })
            if (status !== 200) {
              failure(res, status, doc?.error?.message ?? 'the ads service refused the listing')
              return
            }
            opts.log(`ad listing: ${doc?.listing?.id ?? '?'} for ${opts.wallet.address()}`)
            json(res, 200, doc)
          } catch (error) {
            failure(res, 502, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/ads/fund' || path === '/genkaku/ads/fund/')) {
          if (opts.adCampaign == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          const body = await readJson<Record<string, unknown>>(req)
          const parse = (value: unknown): bigint | null => {
            try {
              const text = String(value ?? '')
              return /^\d+$/.test(text) ? BigInt(text) : null
            } catch {
              return null
            }
          }
          const price = parse(body.priceMicro)
          const budget = parse(body.budgetMicro)
          const requestedMinClaim = parse(body.minClaimMicro) ?? 30_000n
          const index = Number(body.index ?? -1)

          if (price == null || budget == null || price <= 0n || budget < price) {
            failure(res, 400, 'budgetMicro must cover at least one impression')
            return
          }
          if (index < 0 || !Number.isInteger(index)) {
            failure(res, 400, 'index is required')
            return
          }

          const minClaim = requestedMinClaim > budget ? budget : requestedMinClaim

          try {
            if (opts.walletPolicy != null) {
              const decision = opts.walletPolicy.authorize({
                actor: 'owner',
                action: 'campaign-fund',
                amountMicro: budget,
                summary: `Owner funds campaign #${index} with ${(Number(budget) / 1e6).toFixed(2)} USDC`,
                payload: { index, priceMicro: price.toString(), budgetMicro: budget.toString() },
              })
              if (decision.status === 'deny') {
                failure(res, 403, decision.reason)
                return
              }
            }

            const made = await opts.adCampaign.create({ index, priceMicro: price, budgetMicro: budget, minClaimMicro: minClaim })
            if (opts.walletPolicy != null) opts.walletPolicy.recordSpend(budget)
            opts.log(`ad campaign: ${made.campaign} funded with ${budget} micro-USDC`)
            json(res, 200, { ok: true, ...made })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        // Pause/resume: the chain stops accrual and the service stops serving.
        if (req.method === 'POST' && (path === '/genkaku/ads/pause' || path === '/genkaku/ads/pause/')) {
          if (opts.adCampaign == null || opts.adsServiceUrl == null || opts.wallet == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          const body = await readJson<Record<string, unknown>>(req)
          const campaign = typeof body.campaign === 'string' ? body.campaign.trim() : ''
          const id = typeof body.id === 'string' ? body.id : ''
          const paused = body.paused === true
          if (campaign === '' || id === '') {
            failure(res, 400, 'campaign and id are required')
            return
          }

          try {
            const tx = await opts.adCampaign.pause(campaign, paused)
            await adsJson(opts.adsServiceUrl, '/listing/pause', {
              method: 'POST',
              body: { id, advertiser: opts.wallet.address(), campaign, paused },
            }).catch(() => null)
            json(res, 200, { ok: true, tx })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        // Withdraw the unspent budget. The chain refuses until the campaign has
        // been paused for a day and the pause day has been settled.
        if (req.method === 'POST' && (path === '/genkaku/ads/withdraw' || path === '/genkaku/ads/withdraw/')) {
          if (opts.adCampaign == null || opts.wallet == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          const body = await readJson<Record<string, unknown>>(req)
          const campaign = typeof body.campaign === 'string' ? body.campaign.trim() : ''
          if (campaign === '') {
            failure(res, 400, 'campaign is required')
            return
          }

          try {
            const done = await opts.adCampaign.withdraw(campaign)
            json(res, 200, { ok: true, ...done })
          } catch (error) {
            failure(res, 400, chainHint(error instanceof Error ? error.message : String(error)))
          }
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/ads/attach' || path === '/genkaku/ads/attach/')) {
          if (opts.adsServiceUrl == null || opts.wallet == null) {
            failure(res, 501, 'self-serve advertising is not enabled on this bridge')
            return
          }
          const body = await readJson<Record<string, unknown>>(req)
          try {
            const { status, doc } = await adsJson(opts.adsServiceUrl, '/listing/attach', {
              method: 'POST',
              body: { ...body, advertiser: opts.wallet.address() },
            })
            if (status !== 200) {
              failure(res, status, doc?.error?.message ?? 'the ads service refused the attachment')
              return
            }
            json(res, 200, { ok: true })
          } catch (error) {
            failure(res, 502, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (req.method === 'GET' && (path === '/genkaku/status' || path === '/genkaku/status/')) {
          await status(res)
          return
        }

        if (req.method === 'GET' && (path === '/genkaku' || path === '/genkaku/')) {
          dashboard(res)
          return
        }

        if (req.method === 'GET' && (path === '/v1/models' || path === '/models')) {
          await models(res)
          return
        }

        if (req.method === 'POST' && (path === '/v1/chat/completions' || path === '/chat/completions')) {
          await chat(req, res)
          return
        }

        failure(res, 404, 'unknown route: ' + (req.method ?? 'GET') + ' ' + path)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        debugLog('bridge error: ' + message)
        opts.log('bridge: ' + message)

        if (!res.headersSent) {
          failure(res, 500, message)
        } else if (!res.writableEnded) {
          res.end()
        }
      }
    })()
  })

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error)
    server.once('error', onError)
    server.listen(opts.port, '127.0.0.1', () => {
      server.off('error', onError)
      resolve()
    })
  })

  const bound = server.address()
  const port = typeof bound === 'object' && bound !== null ? bound.port : opts.port
  bridgeUrl = 'http://127.0.0.1:' + port + '/v1'

  // Paired workers are discovered by dialing them, which can take a dial
  // timeout each. Probe once at boot and then on a slow ticker so the panel's
  // online flag catches up without ever blocking a status request.
  void refreshPrivate().then(() => refreshBoard())
  const privateTimer = setInterval(() => { void refreshPrivate() }, PRIVATE_PROBE_MS)
  privateTimer.unref?.()

  return {
    url: bridgeUrl,
    close: async () => {
      clearInterval(privateTimer)
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error == null ? resolve() : reject(error)))
        server.closeAllConnections()
      })
    },
  }
}
