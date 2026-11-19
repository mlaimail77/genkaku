// GENKAKU: worker-side status surface — GET /genkaku (dashboard) and
// GET /genkaku/status (JSON). Snapshot is called per request so the page and
// the JSON always reflect the live sidecar, never a boot-time copy.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { applyPanelCors } from './cors.ts'
import { runWalletAction, type WalletControl } from './walletControl.ts'
import type { WalletPolicy } from './walletPolicy.ts'
import type { RoleMode } from './modeManager.ts'
import type { OfferWire } from './offer.ts'

/** One offer row rendered by the dashboard. */
export type StatusOffer = {
  /** peer multiaddr serving this row; omitted for a purely local catalog */
  addr?: string
  offer: OfferWire
}

/** Live facts the status server renders; called once per HTTP request. */
export type StatusSnapshot = {
  role: string
  peerId: string
  peerAddrs: string[]
  /** Protocols the libp2p node actually registered. A worker that is online
   *  but missing /genkaku/offers/0 cannot be found by any client, so this is
   *  the first thing to check when the board looks empty. */
  protocols?: string[]
  wallet: string
  offers: StatusOffer[]
  activeSessions: number
  /** true when at least one announced address is globally dialable (P4.9i) */
  reachable: boolean
  /** config.publishAddress: may a public address be written to the chain? */
  publishAddress: boolean
  /** publishAddress AND a globally dialable address: the entry can be dialed. */
  published?: boolean
  /** true when the profile forces publishing on, so the switch cannot turn it off. */
  publishForced?: boolean
  /** How this worker is reachable: direct libp2p, a relay circuit, or LAN only. */
  transport?: 'direct' | 'relay' | 'lan'
  /** Relay hops this worker reserved (seed VM), for the panel to explain relay mode. */
  relayHints?: string[]
  /** Live wallet figures, base units as decimal strings (lamports / 6-dec
   *  USDC). `accrued` is money already settled INTO the session for this worker
   *  but not claimed out of it yet — the worker's unclaimed earnings. */
  balances?: { sol: string; usdc: string; accrued?: string }
  /** 0.3: tips received into this wallet, read from its own token history. */
  tips?: {
    count: number
    totalMicro: string
    recent: Array<{ signature: string; at: number; micro: string }>
  }
  /** Public display name, falling back to config.workerName. */
  displayName?: string
  /** Public = announced and listed; private = paired wallets only. */
  visibility?: 'public' | 'private'
  /** Wallets allowed to use a private worker. */
  paired?: Array<{ wallet: string; label?: string; pairedAt: number }>
  /** Outstanding one-time codes: id + expiry only, never the secret. */
  pending?: Array<{ id: string; expiresAt: number }>
}

/** Worker identity and pairing edits the panel drives. */
export type ProfileControl = {
  /** Set the public display name and/or switch public/private. */
  update: (patch: { displayName?: string; visibility?: 'public' | 'private' }) =>
    void | Promise<void>
  /** Mint one one-time pairing code. Returns the secret EXACTLY once. */
  createPairing: (label?: string) => Promise<{ code: string; id: string; expiresAt: number }>
  /** Drop a pending code by id. */
  revokePairing: (id: string) => void | Promise<void>
  /** Remove a wallet from the paired list. */
  unpair: (wallet: string) => void | Promise<void>
}

export type StatusHandle = {
  url: string
  close: () => Promise<void>
}

/** One validated catalog row accepted by POST /genkaku/catalog. */
export type CatalogEntryInput = {
  model: string
  pricePerHour: number
  [key: string]: unknown
}

/** Applies a validated catalog replacement; may be async. */
export type CatalogUpdateHandler = (catalog: CatalogEntryInput[]) => void | Promise<void>

/** Applies a validated role-mode switch; may be async. */
export type ModeUpdateHandler = (mode: RoleMode) => void | Promise<void>

/** Applies a directory-publishing opt-in; may be async. */
export type PublishUpdateHandler = (publish: boolean) => void | Promise<void>

/** Worker-side Ollama control the onboarding panel drives. */
export type OllamaControl = {
  /** Detect the install, probe the service and list local models. */
  state: () => Promise<unknown>
  /** Start a stopped service; idempotent. */
  ensureRunning: () => Promise<unknown>
  /** Download a registry model, forwarding NDJSON-friendly progress. */
  pull: (model: string, onProgress: (progress: { status: string; percent?: number }) => void) => Promise<{ status: string }>
  /** Delete one locally installed model. */
  remove: (model: string) => Promise<void>
}

/** Self-contained dashboard; mirrors the user bridge style and polls the JSON. */
const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GENKAKU worker</title>
<style>
body{font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:24px;background:#0b0d10;color:#d7dde5}
h1{font-size:18px;margin:0 0 16px}
.m{color:#7d8794;font-weight:400}
.card{border:1px solid #222832;border-radius:8px;padding:12px;margin:12px 0;background:#11151b}
b{color:#7d8794;font-weight:500;text-transform:uppercase;font-size:11px;letter-spacing:.08em;display:block;margin-bottom:4px}
table{border-collapse:collapse;width:100%}
td,th{text-align:left;padding:4px 8px;border-bottom:1px solid #1c222b}
th{color:#7d8794;font-weight:500}
input.in{background:#0b0d10;color:#d7dde5;border:1px solid #2a323d;border-radius:4px;padding:4px 6px;width:100%;box-sizing:border-box}
input.num{text-align:right}
button{background:#1b2330;color:#d7dde5;border:1px solid #2a323d;border-radius:4px;padding:4px 10px;cursor:pointer}
button.primary{background:#1f6f3f;border-color:#2a8a50}
.actions{display:flex;gap:8px;margin-top:8px}
td button{padding:2px 8px}
</style>
</head>
<body>
<h1>GENKAKU <span class="m">worker</span></h1>
<div id="info">loading...</div>
<div class="card" id="offers-card"></div>
<script>
var e=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
function usdc(v){var n=Number(v);return isFinite(n)?(n/1e6).toFixed(2):e(v)}
function short(v){v=String(v||'');return v.length>12?v.slice(0,6)+'...'+v.slice(-4):v}
function card(label,value){return '<div class="card"><b>'+label+'</b>'+e(value)+'</div>'}
var rows=null;
function microToUsdc(v){var n=Number(v);return isFinite(n)?(n/1e6).toFixed(2):'0.00'}
function usdcToMicro(v){var n=Number(v);return isFinite(n)?Math.round(n*1e6):0}
function offersHtml(){
  var body=(rows||[]).map(function(r,i){
    return '<tr><td><input class="in" value="'+e(r.model)+'" oninput="setModel('+i+',this.value)"></td>'
      +'<td><input class="in num" inputmode="decimal" value="'+e(r.price)+'" oninput="setPrice('+i+',this.value)"></td>'
      +'<td><button type="button" onclick="removeRow('+i+')">remove</button></td></tr>';
  }).join('');
  return '<b>offers</b><table><tr><th>model</th><th>USDC/hour</th><th></th></tr>'
    +(body||'<tr><td colspan="3">no offers</td></tr>')
    +'</table><div class="actions"><button type="button" onclick="addRow()">add offer</button>'
    +'<button type="button" class="primary" onclick="saveCatalog()">save</button></div>';
}
function renderOffers(){
  var el=document.getElementById('offers-card');
  if(el){el.innerHTML=offersHtml()}
}
function setModel(i,v){if(rows&&rows[i]){rows[i].model=v}}
function setPrice(i,v){if(rows&&rows[i]){rows[i].price=v}}
function addRow(){if(!rows){rows=[]}rows.push({model:'',price:'0.00'});renderOffers()}
function removeRow(i){if(rows){rows.splice(i,1);renderOffers()}}
function seedRows(offers){
  rows=(offers||[]).map(function(r){var o=r.offer||{};return {model:String(o.model||''),price:microToUsdc(o.pricePerHour)}});
}
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
function renderInfo(s){
  document.getElementById('info').innerHTML=roleRow(s.role)+card('peer id',s.peerId)
    +card('peer addresses',(s.peerAddrs||[]).join(', '))+card('wallet',s.wallet)
    +card('active sessions',s.activeSessions)
    +card('connection',s.transport==='direct'?'libp2p direct'
      :s.transport==='relay'?'seed VM relay (traffic is forwarded; clients try direct first)'
      :'this network only — no public address and no relay reservation yet')
    +card('discovery',s.reachable
      ? (s.publishAddress
          ? 'global directory (public address published)'
          : 'public address available — publishing is OFF (privacy); enable publishAddress to be found')
      : 'this network only — not listed in the global directory');
}
async function load(){
  try{
    var res=await fetch('/genkaku/status',{cache:'no-store'});
    var s=await res.json();
    renderInfo(s);
    if(rows===null){seedRows(s.offers);renderOffers()}
  }catch(err){
    document.getElementById('info').innerHTML='<div class="card">status unavailable: '+e(err&&err.message?err.message:String(err))+'</div>';
  }
}
async function saveCatalog(){
  var payload=(rows||[]).map(function(r){return {model:String(r.model||'').trim(),pricePerHour:usdcToMicro(r.price)}});
  try{
    var res=await fetch('/genkaku/catalog',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({catalog:payload})});
    var body=await res.json();
    if(!res.ok){throw new Error((body.error&&body.error.message)||String(res.status))}
    seedRows(body.offers);
    renderInfo(body);
    renderOffers();
  }catch(err){
    alert('Save failed: '+(err&&err.message?err.message:String(err)));
  }
}
load();
setInterval(load,5000);
</script>
</body>
</html>`

function json(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function failure(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: { message } }))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += (chunk as Buffer).length
    if (bytes > 1024 * 1024) throw new Error('request body too large')
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')
}

type CatalogParse = { ok: true; catalog: CatalogEntryInput[] } | { ok: false; error: string }

/** Validate {catalog:[{model, pricePerHour, ...}]}; price may be a numeric string. */
function parseCatalog(body: unknown): CatalogParse {
  if (typeof body !== 'object' || body === null || !Array.isArray((body as { catalog?: unknown }).catalog)) {
    return { ok: false, error: 'body must be {"catalog": [...]}' }
  }
  const catalog: CatalogEntryInput[] = []
  for (const row of (body as { catalog: unknown[] }).catalog) {
    if (typeof row !== 'object' || row === null) return { ok: false, error: 'catalog rows must be objects' }
    const model = (row as { model?: unknown }).model
    if (typeof model !== 'string' || model.trim() === '') {
      return { ok: false, error: 'catalog row model must be a non-empty string' }
    }
    const raw = (row as { pricePerHour?: unknown }).pricePerHour
    const price = typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN
    if (!Number.isFinite(price)) {
      return { ok: false, error: 'catalog row pricePerHour must be a finite number' }
    }
    catalog.push({ ...(row as Record<string, unknown>), model: model.trim(), pricePerHour: price })
  }
  return { ok: true, catalog }
}

/** Serve the dashboard and live status JSON on 127.0.0.1. */
/** Everything the worker dashboard can drive. Named fields rather than a long
 *  positional list: the wallet joined five other callbacks, and a positional
 *  boolean trade at the end is how panels end up wiring the wrong handler. */
export type StatusServerOptions = {
  port: number
  snapshot: () => StatusSnapshot | Promise<StatusSnapshot>
  onCatalog?: CatalogUpdateHandler
  onMode?: ModeUpdateHandler
  ollama?: OllamaControl
  onPublish?: PublishUpdateHandler
  /** Worker identity wallet: export/import/rotate. No mint — a worker earns
   *  USDC; a worker only needs SOL for rent and fees. */
  wallet?: WalletControl
  /** 0.5: what an agent may do with this worker's wallet. */
  walletPolicy?: WalletPolicy
  /** The token an agent must present on /genkaku/agent/wallet. */
  agentToken?: string
  /** Public/private switch, display name and one-time pairing codes. */
  profile?: ProfileControl
}

export async function startStatusServer(opts: StatusServerOptions): Promise<StatusHandle> {
  const { port, snapshot, onCatalog, onMode, ollama, onPublish, wallet, profile, walletPolicy, agentToken } = opts
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
          if (onMode == null) {
            failure(res, 501, 'mode switching is not enabled')
            return
          }
          let body: { mode?: unknown }
          try {
            body = await readJson(req) as { mode?: unknown }
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          const mode = body.mode
          if (mode !== 'user' && mode !== 'localPlusSharing' && mode !== 'workerDedicated') {
            failure(res, 400, 'mode must be one of user, localPlusSharing, workerDedicated')
            return
          }
          await onMode(mode)
          json(res, { ok: true })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/catalog' || path === '/genkaku/catalog/')) {
          if (onCatalog == null) {
            failure(res, 501, 'catalog updates are not enabled')
            return
          }
          let body: unknown
          try {
            body = await readJson(req)
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          const parsed = parseCatalog(body)
          if (!parsed.ok) {
            failure(res, 400, parsed.error)
            return
          }
          await onCatalog(parsed.catalog)
          json(res, await snapshot())
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/publish' || path === '/genkaku/publish/')) {
          if (onPublish == null) {
            failure(res, 501, 'directory publishing is not enabled')
            return
          }
          let body: { publish?: unknown }
          try {
            body = await readJson(req) as { publish?: unknown }
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (typeof body.publish !== 'boolean') {
            failure(res, 400, 'publish must be a boolean')
            return
          }
          await onPublish(body.publish)
          json(res, { ok: true })
          return
        }

        if (walletPolicy != null
          && req.method === 'GET' && (path === '/genkaku/wallet/policy' || path === '/genkaku/wallet/policy/')) {
          json(res, { ok: true, ...walletPolicy.snapshot() })
          return
        }

        if (walletPolicy != null
          && req.method === 'POST' && (path === '/genkaku/wallet/policy' || path === '/genkaku/wallet/policy/')) {
          let body: Record<string, unknown>
          try {
            body = await readJson(req) as Record<string, unknown>
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          try {
            if (typeof body.mode === 'string') walletPolicy.setMode(body.mode)
            if (typeof body.frozen === 'boolean') walletPolicy.setFrozen(body.frozen)
            if (body.perTxMicro != null || body.dailyMicro != null) {
              walletPolicy.setCaps({ perTxMicro: body.perTxMicro, dailyMicro: body.dailyMicro })
            }
            json(res, { ok: true, ...walletPolicy.snapshot() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (walletPolicy != null
          && req.method === 'POST' && (path === '/genkaku/wallet/approve' || path === '/genkaku/wallet/approve/')) {
          const body = await readJson(req) as Record<string, unknown>
          try {
            const request = walletPolicy.approve(String(body.id ?? ''))
            json(res, { ok: true, request, policy: walletPolicy.snapshot() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (walletPolicy != null
          && req.method === 'POST' && (path === '/genkaku/wallet/deny' || path === '/genkaku/wallet/deny/')) {
          const body = await readJson(req) as Record<string, unknown>
          try {
            const request = walletPolicy.deny(String(body.id ?? ''))
            json(res, { ok: true, request, policy: walletPolicy.snapshot() })
          } catch (error) {
            failure(res, 400, error instanceof Error ? error.message : String(error))
          }
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/agent/wallet' || path === '/genkaku/agent/wallet/')) {
          if (walletPolicy == null || agentToken == null || wallet == null) {
            failure(res, 501, 'agent wallet access is not enabled on this worker')
            return
          }
          if (req.headers['x-genkaku-agent-token'] !== agentToken) {
            failure(res, 401, 'agent token is missing or wrong')
            return
          }
          const body = await readJson(req) as Record<string, unknown>
          if (String(body.action ?? '') !== 'claim') {
            failure(res, 403, 'only claiming is available to an agent')
            return
          }
          const approvalId = typeof body.approvalId === 'string' ? body.approvalId : ''
          try {
            if (approvalId !== '') {
              walletPolicy.takeApproval({ id: approvalId, action: 'claim', payload: {} })
            } else {
              const decision = walletPolicy.authorize({
                actor: 'agent',
                action: 'claim',
                summary: 'Agent claims this worker\'s ad earnings',
                payload: {},
              })
              if (decision.status === 'deny') {
                failure(res, 403, decision.reason)
                return
              }
              if (decision.status === 'pending') {
                res.writeHead(202, { 'content-type': 'application/json' })
                res.end(JSON.stringify({ ok: false, status: 'pending', request: decision.request }))
                return
              }
            }
            if (wallet.claim == null) throw new Error('claiming is not available')
            const txs = await wallet.claim()
            if (approvalId !== '') walletPolicy.complete(approvalId, txs[0] ?? '')
            json(res, { ok: true, tx: txs[0] ?? '', txs })
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (approvalId !== '') walletPolicy.fail(approvalId, message)
            failure(res, 400, message)
          }
          return
        }

        if (req.method === 'POST' && path.startsWith('/genkaku/wallet/')) {
          const action = path.slice('/genkaku/wallet/'.length).replace(/\/$/, '')
          if (wallet == null) {
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
          if (walletPolicy != null && action === 'claim') {
            const decision = walletPolicy.authorize({
              actor: 'owner',
              action: 'claim',
              summary: 'Owner claims ad earnings',
              payload: {},
            })
            if (decision.status === 'deny') {
              failure(res, 403, decision.reason)
              return
            }
          }
          const reply = await runWalletAction(action, body, wallet)
          res.writeHead(reply.status, {
            'content-type': 'application/json',
            ...(action === 'export' ? { 'cache-control': 'no-store' } : {}),
          })
          res.end(JSON.stringify(reply.doc))
          return
        }

        if (path === '/genkaku/ollama' || path === '/genkaku/ollama/') {
          if (ollama == null) {
            failure(res, 501, 'ollama onboarding is not enabled in this role')
            return
          }
          if (req.method === 'GET') {
            json(res, await ollama.state())
            return
          }
          if (req.method === 'POST') {
            json(res, await ollama.ensureRunning())
            return
          }
        }

        if (req.method === 'POST' && (path === '/genkaku/ollama/pull' || path === '/genkaku/ollama/pull/')) {
          if (ollama == null) {
            failure(res, 501, 'ollama onboarding is not enabled in this role')
            return
          }
          let body: { model?: unknown }
          try {
            body = await readJson(req) as { model?: unknown }
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (typeof body.model !== 'string' || body.model.trim() === '') {
            failure(res, 400, 'model must be a non-empty string')
            return
          }
          res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' })
          const frame = (value: unknown): void => { res.write(`${JSON.stringify(value)}\n`) }
          try {
            const result = await ollama.pull(body.model.trim(), (progress) => { frame(progress) })
            frame({ done: true, status: result.status })
          } catch (error) {
            frame({ error: { message: error instanceof Error ? error.message : String(error) } })
          }
          res.end()
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/ollama/delete' || path === '/genkaku/ollama/delete/')) {
          if (ollama == null) {
            failure(res, 501, 'ollama onboarding is not enabled in this role')
            return
          }
          let body: { model?: unknown }
          try {
            body = await readJson(req) as { model?: unknown }
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (typeof body.model !== 'string' || body.model.trim() === '') {
            failure(res, 400, 'model must be a non-empty string')
            return
          }
          await ollama.remove(body.model.trim())
          json(res, { ok: true })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/profile' || path === '/genkaku/profile/')) {
          if (profile == null) {
            failure(res, 501, 'worker profile edits are not enabled in this role')
            return
          }
          let body: { displayName?: unknown; visibility?: unknown }
          try {
            body = await readJson(req) as typeof body
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          const patch: { displayName?: string; visibility?: 'public' | 'private' } = {}
          if (body.displayName !== undefined) {
            if (typeof body.displayName !== 'string') {
              failure(res, 400, 'displayName must be a string')
              return
            }
            patch.displayName = body.displayName
          }
          if (body.visibility !== undefined) {
            if (body.visibility !== 'public' && body.visibility !== 'private') {
              failure(res, 400, 'visibility must be "public" or "private"')
              return
            }
            patch.visibility = body.visibility
          }
          await profile.update(patch)
          json(res, await snapshot())
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/pairing' || path === '/genkaku/pairing/')) {
          if (profile == null) {
            failure(res, 501, 'pairing is not enabled in this role')
            return
          }
          let body: { label?: unknown } = {}
          try {
            body = await readJson(req) as typeof body
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (body.label !== undefined && typeof body.label !== 'string') {
            failure(res, 400, 'label must be a string')
            return
          }
          const created = await profile.createPairing(body.label)
          // The code is shown once. It is never in the snapshot: a panel that
          // could re-read it would make a one-time secret reusable.
          json(res, { ok: true, ...created })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/pairing/revoke' || path === '/genkaku/pairing/revoke/')) {
          if (profile == null) {
            failure(res, 501, 'pairing is not enabled in this role')
            return
          }
          let body: { id?: unknown }
          try {
            body = await readJson(req) as typeof body
          } catch {
            failure(res, 400, 'invalid JSON body')
            return
          }
          if (typeof body.id !== 'string' || body.id === '') {
            failure(res, 400, 'id must be a pending pairing id')
            return
          }
          await profile.revokePairing(body.id)
          json(res, { ok: true, revoked: body.id })
          return
        }

        if (req.method === 'POST' && (path === '/genkaku/unpair' || path === '/genkaku/unpair/')) {
          if (profile == null) {
            failure(res, 501, 'pairing is not enabled in this role')
            return
          }
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
          await profile.unpair(body.wallet)
          json(res, await snapshot())
          return
        }

        if (req.method === 'GET' && (path === '/genkaku/status' || path === '/genkaku/status/')) {
          json(res, await snapshot())
          return
        }

        if (req.method === 'GET' && (path === '/genkaku' || path === '/genkaku/')) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
          res.end(DASHBOARD_HTML)
          return
        }

        failure(res, 404, 'unknown route: ' + (req.method ?? 'GET') + ' ' + path)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!res.headersSent) failure(res, 500, message)
        else if (!res.writableEnded) res.end()
      }
    })()
  })

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => { reject(error) }
    server.once('error', onError)
    server.listen(port, '127.0.0.1', () => {
      server.off('error', onError)
      resolve()
    })
  })

  const bound = server.address()
  const boundPort = typeof bound === 'object' && bound !== null ? bound.port : port

  return {
    url: `http://127.0.0.1:${boundPort}/genkaku`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error == null) resolve()
          else reject(error)
        })
        server.closeAllConnections()
      })
    },
  }
}
