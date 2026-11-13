// GENKAKU for dsh: OpenAI-compatible bridge (user side).
// The dsh agent loop talks plain OpenAI HTTP; this bridge dials a genkaku
// worker over libp2p, meters the session with receipts, and settles the
// escrow on Base Sepolia. No provider wire code leaks into dsh.

import { appendFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import type { Libp2p } from 'libp2p'

import { applyPanelCors } from './cors.ts'
import { runWalletAction, type WalletControl } from './walletControl.ts'
import type { Hex } from 'viem'

import {
  openEscrow,
  publicClientFor,
  readWorker,
  refundSession,
  settleSession,
  signReceiptPayload,
  walletAddress,
  walletClientFor,
} from './chain.ts'
import { dialWorkerAny, fetchOffers, requestSettleCosign } from './dial.ts'
import type { ChatMessage } from './llmBridge.ts'
import type { ModeManager, RoleMode } from './modeManager.ts'
import type { NetEnvironment } from './netconfig.ts'
import { dedupeOffers, toWire, type Offer } from './offer.ts'
import { bindingOf, peerIdOf } from './registry.ts'
import { runUserSession } from './userSession.ts'

/** JSON served by GET /genkaku/status and rendered by GET /genkaku. */
export type BridgeStatus = {
  role: string
  workers: string[]
  wallet: string
  offers: Array<{ addr: string; offer: ReturnType<typeof toWire> }>
  url: string
  /** addr → the path its last session took: direct libp2p or the seed relay. */
  transports?: Record<string, 'direct' | 'relay'>
}

export type BridgeOptions = {
  workers: string[]
  port: number
  env: NetEnvironment
  modeManager: ModeManager
  getNode: () => Promise<Libp2p>
  userKey: () => Hex
  /** settle real escrows (Base Sepolia only); false = free/dev sessions */
  settle: boolean
  log: (line: string) => void
  /** optional extra fields merged over the base status JSON (dashboard extension hook) */
  /** Relay hops to fall back to once a direct dial keeps failing. */
  getRelays?: () => Promise<string[]>
  status?: (base: BridgeStatus) => Record<string, unknown> | Promise<Record<string, unknown>>
  /** optional live mode switch from POST /genkaku/mode */
  onMode?: (mode: RoleMode) => void | Promise<void>
  /** Persist the panel's settings edits (workers / payments) into the plugin's
   *  settings document. The runtime applies them by restarting the bridge. */
  onSettings?: (patch: { workers?: string[]; settle?: boolean }) => void | Promise<void>
  /** Re-run discovery. The worker set is read at startup, so the host restarts
   *  its half; this callback returns before that happens (the reply must land). */
  onRefresh?: () => void | Promise<void>
  /** Wallet operations the panel drives. Key material only ever leaves over
   *  the panel CORS gate, and only after an explicit confirmation flag. */
  wallet?: WalletControl
  /** P4.9h: derived credit per worker wallet (escrow events, not self-report).
   *  Absent = offers keep whatever the worker claimed. */
  credit?: (
    wallets: string[],
  ) => Map<string, { score: number; sessions: number }> | Promise<Map<string, { score: number; sessions: number }>>
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
    case 'unknown-escrow':
    case 'wrong-worker':
    case 'closed-escrow':
    case 'empty-escrow':
    case 'bad-escrow':
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

const DEBUG_LOG = '/tmp/genkaku-bridge.log'

/** Dev diagnostics: one line per request/error; logging never fails the request. */
function debugLog(line: string): void {
  try {
    appendFileSync(DEBUG_LOG, new Date().toISOString() + ' ' + line + String.fromCharCode(10))
  } catch {
    // best effort
  }
}

/** Chain writes run one at a time per bridge.
 *
 *  A chat response is written to the client BEFORE its escrow is settled or
 *  refunded, so the next request can arrive while that transaction is still in
 *  flight. Both then ask an RPC endpoint for the account's "pending" nonce —
 *  and `fallback` may answer from a different endpoint than the one that
 *  accepted the first transaction. The second write reuses that nonce, every
 *  endpoint rejects it, and the user sees a 500 instead of an answer. A single
 *  queue removes the overlap; the retry covers the remaining window where the
 *  endpoint that served the nonce simply had not seen the previous receipt. */
let chainQueue: Promise<unknown> = Promise.resolve()

const NONCE_RACE = /nonce|already known|known transaction|replacement transaction|underpriced/i

function chainWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = chainQueue.then(async () => {
    try {
      return await task()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!NONCE_RACE.test(message)) throw error
      // The queue is what keeps writes apart; the retry only covers an RPC
      // endpoint whose "pending" view had not caught up with the last receipt.
      await new Promise(resolve => setTimeout(resolve, 2_000))
      return await task()
    }
  })
  chainQueue = run.then(() => undefined, () => undefined)
  return run
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

export async function startOpenAiBridge(opts: BridgeOptions): Promise<BridgeHandle> {
  const cache = new Map<string, { at: number; offers: Offer[] }>()
  const transports = new Map<string, 'direct' | 'relay'>()
  let bridgeUrl = ''

  async function offersOf(addr: string): Promise<Offer[]> {
    const hit = cache.get(addr)
    if (hit != null && Date.now() - hit.at < OFFERS_TTL_MS) return hit.offers
    const node = await opts.getNode()
    const offers = await fetchOffers(node, addr)
    cache.set(addr, { at: Date.now(), offers })
    return offers
  }

  async function board(): Promise<Array<{ addr: string; offer: Offer }>> {
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
          return (await offersOf(addr)).map(offer => ({ addr, offer }))
        } catch (error) {
          opts.log(`offers: ${addr} unreachable (${error instanceof Error ? error.message : String(error)})`)
        }
      }
      return []
    }))
    return dedupeOffers(rows.flat())
  }

  /** P4.4 close-out: ask the worker to co-sign the held max-cumulative receipt,
   *  then settle the escrow with that signature. Refused/failed settlements are
   *  logged but never fail the HTTP response — the tokens already flowed. */
  async function settle(args: {
    node: Libp2p
    addr: string
    walletC: ReturnType<typeof walletClientFor>
    jobId: string
    escrowId: string
    receiptHash: Hex
    spend: bigint
  }): Promise<void> {
    let cosign: Awaited<ReturnType<typeof requestSettleCosign>>

    try {
      cosign = await requestSettleCosign(args.node, args.addr, {
        jobId: args.jobId,
        escrowId: args.escrowId,
        receiptHash: args.receiptHash,
        spend: args.spend,
      })
    } catch (error) {
      const message = `settle ${args.jobId}: co-sign unreachable (${error instanceof Error ? error.message : String(error)})`
      debugLog(message)
      opts.log(message)
      return
    }

    if (!cosign.ok || cosign.sig == null) {
      debugLog(`settle ${args.jobId}: worker refused (${cosign.reason ?? 'no reason'})`)
      opts.log(`settle ${args.jobId}: worker refused (${cosign.reason ?? 'no reason'})`)
      return
    }

    try {
      const txHash = await settleSession(args.walletC, opts.env, {
        escrowId: BigInt(args.escrowId),
        receiptHash: args.receiptHash,
        spend: args.spend,
        workerSig: cosign.sig,
      })
      debugLog(`settle ${args.jobId}: escrow ${args.escrowId}, spend ${args.spend}, tx ${txHash}`)
      opts.log(`settle ${args.jobId}: escrow ${args.escrowId}, spend ${args.spend}, tx ${txHash}`)
    } catch (error) {
      const message = `settle ${args.jobId}: tx failed (${error instanceof Error ? error.message : String(error)})`
      debugLog(message)
      opts.log(message)
    }
  }

  const models = async (res: ServerResponse): Promise<void> => {
    const rows = await board()
    const seen = new Map<string, { tier: string; capabilities: string[]; parameterSize?: string }>()
    for (const { offer } of rows) {
      if (seen.has(offer.model)) continue
      // A v0 row carries no capability facts, so it is chat-only by definition.
      seen.set(offer.model, {
        tier: offer.tier ?? 'chat',
        capabilities: offer.capabilities ?? [],
        ...(offer.parameterSize === undefined ? {} : { parameterSize: offer.parameterSize }),
      })
    }
    const data = [...seen.entries()].map(([id, facts]) => ({
      id,
      object: 'model' as const,
      created: 0,
      owned_by: 'genkaku',
      // Non-standard, ignored by OpenAI clients and read by our selector.
      genkaku: facts,
    }))
    json(res, 200, { object: 'list', data })
  }

  const status = async (res: ServerResponse): Promise<void> => {
    const { mode } = opts.modeManager.current()
    const rows = await board()
    const wallets = rows
      .map(row => row.offer.workerWallet)
      .filter((w): w is string => w != null && w.startsWith('0x'))
    const credits = opts.credit == null || wallets.length === 0 ? null : await opts.credit(wallets)
    const offers = rows.map((row) => {
      const score = row.offer.workerWallet == null ? undefined : credits?.get(row.offer.workerWallet.toLowerCase())
      const offer = score == null
        ? row.offer
        : { ...row.offer, creditScore: score.score, sessionsServed: score.sessions, creditSource: 'chain' as const }

      return { addr: row.addr, offer: toWire(offer) }
    })
    const base: BridgeStatus = {
      role: mode,
      workers: opts.workers,
      wallet: walletAddress(opts.userKey()),
      offers,
      url: bridgeUrl,
      ...(transports.size === 0 ? {} : { transports: Object.fromEntries(transports) }),
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

    const rows = await board()
    const picked = rows.find(row => row.offer.model === model) ?? (rows.length === 1 ? rows[0] : undefined)
    if (picked == null) return failure(res, 404, `model "${model}" is not offered by any configured worker`)

    if (picked.offer.workerWallet?.startsWith('0x')) {
      const wallet = picked.offer.workerWallet as Hex
      const peerId = peerIdOf(picked.addr)
      const proven = picked.offer.walletVerified === true

      try {
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
        if (binding !== 'bound' && !proven && opts.settle) {
          opts.log(`identity: ${wallet} at ${picked.addr} is neither proven nor bound — refusing a paid session`)
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
    let escrowId = '0'
    let walletC: ReturnType<typeof walletClientFor> | null = null

    // A zero quote is free by the operator's own listing. Opening an escrow of
    // 0 reverts on-chain, and the worker's paywall accepts an unpriced session
    // for exactly these models, so skip the chain entirely.
    if (picked.offer.pricePerHour === 0n) {
      opts.log(`session ${jobId}: ${picked.offer.model} is free — no escrow`)
    } else if (opts.settle && picked.offer.workerWallet?.startsWith('0x')) {
      walletC = walletClientFor(opts.env, opts.userKey())
      const opened = await chainWrite(() => openEscrow(
        publicClientFor(opts.env), walletC!, opts.env,
        picked.offer.workerWallet as Hex, picked.offer.pricePerHour,
      ))
      escrowId = opened.escrowId.toString()
    }

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
        id, object: 'chat.completion.chunk', created, model: picked.offer.model,
        choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
      })}\n\n`)
    }

    const writeChunk = (delta: Record<string, unknown>, finish: string | null, usage?: Record<string, number>): void => {
      if (!sse || res.destroyed) return
      startStream()
      const chunk: Record<string, unknown> = {
        id, object: 'chat.completion.chunk', created, model: picked.offer.model,
        choices: [{ index: 0, delta, finish_reason: finish }],
      }
      if (usage != null) chunk.usage = usage
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    }

    let receiptHash: Hex | null = null
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
        escrowId,
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
            receiptHash = event.receiptHash as Hex
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
          model: picked.offer.model,
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

      if (opts.settle && walletC != null && escrowId !== '0') {
        if (receiptHash != null && result.billed > 0n) {
          // The commitment the money is bound to — re-derive it offline from
          // the prompt/answer to audit a settle (P4.9f commit-challenge).
          debugLog(`receipt ${jobId}: hash=${receiptHash} billed=${result.billed} tokens=${result.tokens}`)
          await chainWrite(() => settle({
            node,
            // Co-sign over the same path the session used: a worker behind NAT
            // is only reachable through its relay address.
            addr: dialed.addr,
            walletC: walletC!,
            jobId,
            escrowId,
            receiptHash: receiptHash as Hex,
            spend: result.billed,
          }))
        } else {
          // Nothing was billed (a session shorter than one started minute).
          // Return the escrow instead of leaving the user's money parked.
          try {
            const tx = await chainWrite(() =>
              refundSession(walletC!, opts.env, BigInt(escrowId)))
            debugLog(`escrow ${escrowId}: nothing billed, refunded (tx ${tx})`)
            opts.log(`escrow ${escrowId}: nothing billed, refunded (tx ${tx})`)
          } catch (error) {
            const message = `escrow ${escrowId}: refund failed (${error instanceof Error ? error.message : String(error)})`
            debugLog(message)
            opts.log(message)
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined
      debugLog('chat error: ' + message)
      opts.log('session ' + jobId + ': ' + message)

      // The escrow was opened before the session; if anything threw before a
      // settlement, the funds must go back instead of sitting in the contract
      // (a non-technical user would never find the manual refund).
      if (opts.settle && walletC != null && escrowId !== '0') {
        try {
          const tx = await chainWrite(() =>
            refundSession(walletC!, opts.env, BigInt(escrowId)))
          debugLog(`escrow ${escrowId}: session failed before settle, refunded (tx ${tx})`)
          opts.log(`escrow ${escrowId}: refunded after a failed session (tx ${tx})`)
        } catch (refundError) {
          debugLog(`escrow ${escrowId}: refund after failure failed (${refundError instanceof Error ? refundError.message : String(refundError)})`)
        }
      }

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

        if (req.method === 'POST' && (path === '/genkaku/settings' || path === '/genkaku/settings/')) {
          let body: { workers?: unknown; settle?: unknown; refresh?: unknown }
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
            if (opts.onRefresh != null) {
              try {
                await opts.onRefresh()
              } catch (error) {
                opts.log(`refresh: restart refused (${error instanceof Error ? error.message : String(error)})`)
              }
            }
          }

          const patch: { workers?: string[]; settle?: boolean } = {}

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

          if (body.settle !== undefined) {
            if (typeof body.settle !== 'boolean') {
              failure(res, 400, 'settle must be a boolean')
              return
            }
            patch.settle = body.settle
          }

          if (Object.keys(patch).length > 0) {
            if (opts.onSettings == null) {
              failure(res, 501, 'settings are not writable in this profile')
              return
            }
            await opts.onSettings(patch)
          }

          json(res, 200, { ok: true, applied: Object.keys(patch), refreshed: body.refresh === true })
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

  return {
    url: bridgeUrl,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error == null ? resolve() : reject(error)))
        server.closeAllConnections()
      })
    },
  }
}
