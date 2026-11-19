/**
 * GenKaKu worker panel: a first-class sidebar entry, not a card buried in the
 * plugins page.
 *
 * The page reads the plugin's own status endpoint on 127.0.0.1 — the same JSON
 * the HTML dashboard uses — so the panel and the dashboard can never disagree.
 * Everything the panel can change goes through that same server, which means
 * the browser never needs a second channel to the worker.
 *
 * The status shape is the wire shape: offers are `{ addr, offer: {...} }`,
 * because an offer is always published with the address that serves it.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { installLocale, localeChoice, localeOptions, setLocaleChoice, t } from './i18n.ts'
import { useLocaleVersion } from './useLocale.tsx'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { Button, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'

import markBlackUrl from './assets/genkaku-mark-b.png'
import markWhiteUrl from './assets/genkaku-mark-w.png'

const PANEL_ID = 'genkaku-worker' as MainPanelId

/** The status server takes the first free port in this range: a machine that
 *  also runs the user plugin has its bridge on 47821, so a hardcoded origin
 *  would point the worker panel at the user's dashboard. */
const CANDIDATE_PORTS = [47821, 47822, 47823, 47824, 47825, 47826] as const
const originOf = (port: number): string => `http://127.0.0.1:${port}`

/** True when something answers on that port.
 *
 *  A CORS refusal hides its status code from the real request (the fetch just
 *  rejects), so "nothing is listening" and "a bridge rejected this window"
 *  look identical. An opaque no-cors request still resolves on a 403 and only
 *  rejects when the connection itself fails, which separates the two. */
async function listening(port: number): Promise<boolean> {
  try {
    await fetch(`${originOf(port)}/genkaku/status`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(1_500),
    })

    return true
  } catch {
    return false
  }
}

/** The panel registers into the slot registry, so wait for that service. */
export const inject = ['slots', 'locale']

/** Two languages is enough here: the panel ships with the app, not the site. */
type Offer = {
  model?: string
  pricePerHour?: string | number
  tier?: string
  parameterSize?: string
  capabilities?: string[]
}

type StatusOffer = { addr?: string; offer?: Offer }

type Status = {
  role?: string
  peerId?: string
  peerAddrs?: string[]
  wallet?: string
  offers?: StatusOffer[]
  activeSessions?: number
  reachable?: boolean
  publishAddress?: boolean
  published?: boolean
  publishForced?: boolean
  transport?: 'direct' | 'relay' | 'lan'
  relayHints?: string[]
  balances?: { sol: string; usdc: string; accrued?: string }
  /** 0.3: tips sent straight into this wallet by users, read from its own
   *  token history. GenKaKu never holds this money. */
  tips?: {
    count: number
    totalMicro: string
    recent?: Array<{ signature: string; at: number; micro: string }>
  }
  /** Effective display name (personal name, ID or nickname). */
  displayName?: string
  visibility?: 'public' | 'private'
  paired?: Array<{ wallet: string; label?: string; pairedAt: number }>
  pending?: Array<{ id: string; expiresAt: number }>
}

type OllamaModel = {
  name: string
  sizeBytes?: number
  family?: string
  quantization?: string
}

type OllamaState = {
  installed?: boolean
  running?: boolean
  version?: string
  host?: string
  downloadUrl?: string
  models?: OllamaModel[]
  error?: string
}

/** Prices are edited in USDC but stored as 6-decimal micro units. */
/** A newly ticked model starts free; the worker sets its own price. */
const DEFAULT_PRICE = '0.00'

/** Shown as the tooltip on the tip total: users need to know whose money this
 *  is before they read a balance as unclaimed revenue. */
const TIP_TITLE = {
  en: 'Tips go straight from the user’s wallet into this one. GenKaKu is not a party to the transfer, takes no fee, and never holds the money.',
  zh: '打賞由使用者的錢包直接進入這個錢包。GenKaKu 不是轉帳的一方、不抽成，也從不代持這筆錢。',
}
const microToUsdc = (value: string | number | undefined): string => {
  const n = Number(value)
  return Number.isFinite(n) ? (n / 1e6).toFixed(2) : DEFAULT_PRICE
}
const usdcToMicro = (value: string): number => Math.round(Number(value) * 1e6)
const gb = (bytes: number | undefined): string =>
  bytes === undefined ? '' : `${(bytes / 1e9).toFixed(1)} GB`
const shortAddr = (addr: string | undefined): string =>
  addr == null || addr === '' ? '—' : `${addr.slice(0, 6)}…${addr.slice(-4)}`
const solFmt = (lamports: string | undefined): string => {
  const n = Number(lamports)
  return Number.isFinite(n) ? `${(n / 1e9).toFixed(4)} SOL` : '—'
}
/** USDC carries six decimals and a session bills ~167 micro — two decimals
 *  would print both the balance and a tip as "0.00". */
const usdcFmt = (micro: string | undefined): string => {
  const n = Number(micro)
  if (!Number.isFinite(n)) return '—'
  const fixed = (n / 1e6).toFixed(6).replace(/0+$/, '')
  const trimmed = fixed.endsWith('.') ? `${fixed}00` : fixed.length - fixed.indexOf('.') === 2 ? `${fixed}0` : fixed
  return `${trimmed} USDC`
}

const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' }
// Same vocabulary as the user panel, on purpose: the two panels are one product.
// Geometry and type sizes are identical; the border colour still resolves from
// the theme so the cards stay legible in light mode too.
const dim: CSSProperties = { opacity: 0.6 }
const caption: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1,
  opacity: 0.6,
  marginBottom: 6,
}
const box: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12))',
  borderRadius: 10,
  padding: 12,
  marginTop: 12,
}
const dot = (on: boolean): CSSProperties => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: 8,
  marginRight: 8,
  background: on ? 'var(--dsw-alias-state-success-primary, #34a853)' : 'var(--dsw-alias-label-tertiary)',
})

const PANEL_CSS = `
.gk-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 68px 104px auto;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.gk-row:first-of-type { border-top: none; }
.gk-price { width: 88px; }
.gk-price input { text-align: right; }
.gk-pull { width: 260px; max-width: 100%; }
.gk-muted { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
/* The panel can hold every model Ollama has (two dozen is normal). A bounded
   list keeps the download box, Save and the Worker section reachable.
   macOS auto-hides native scrollbars (and Chromium screenshots never paint
   them), so the bar is drawn by us: always visible, and click-to-jump. */
.gk-models-wrap { position: relative; padding-right: 12px; }
.gk-models {
  max-height: min(420px, 45vh);
  overflow-y: auto;
  scrollbar-width: none;
}
.gk-models::-webkit-scrollbar { display: none; }
.gk-rail {
  position: absolute;
  top: 2px;
  bottom: 2px;
  right: 2px;
  width: 8px;
  border-radius: 4px;
  background: rgba(127,137,153,.16);
  cursor: pointer;
}
.gk-thumb {
  position: absolute;
  left: 0;
  width: 8px;
  min-height: 16px;
  border-radius: 4px;
  background: rgba(127,137,153,.7);
}
.gk-rail:hover .gk-thumb { background: rgba(127,137,153,.9); }
`

/** The host app owns the theme, not the OS: `body[data-ds-dark-theme]` is the
 *  only reliable signal. A dark OS with a light app used to render the white
 *  mark on a white sidebar, so the pair is picked by the app's marker. */
function Icon({ size = 16 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', width: size, height: size }} aria-hidden="true">
      <style>{`
        .genkaku-mark-b { display: inline !important; }
        .genkaku-mark-w { display: none !important; }
        body[data-ds-dark-theme] .genkaku-mark-b { display: none !important; }
        body[data-ds-dark-theme] .genkaku-mark-w { display: inline !important; }
      `}</style>
      <img
        src={markBlackUrl}
        alt=""
        width={size}
        height={size}
        className="genkaku-mark-b"
        style={{ width: size, height: size }}
      />
      <img
        src={markWhiteUrl}
        alt=""
        width={size}
        height={size}
        className="genkaku-mark-w"
        style={{ width: size, height: size }}
      />
    </span>
  )
}

function seedDraft(status: Status): Record<string, string> {
  const draft: Record<string, string> = {}
  for (const entry of status.offers ?? []) {
    const model = entry.offer?.model
    if (typeof model === 'string' && model !== '') draft[model] = microToUsdc(entry.offer?.pricePerHour)
  }
  return draft
}

/** Compare drafts by content so a poll never looks like a user edit. */
function draftSignature(draft: Record<string, string>): string {
  return Object.entries(draft)
    .map(([model, price]) => `${model}=${price}`)
    .sort()
    .join('|')
}

/** Scroll position for the model list's always-visible rail. macOS hides
 *  native scrollbars unless a trackpad is moving, so the bar is ours. */
function useScrollThumb() {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null)

  // A callback ref, so the observers attach when the list actually mounts
  // (the panel renders a loading view first, when this div does not exist).
  const attach = useCallback((next: HTMLDivElement | null) => {
    nodeRef.current = next
    setNode(next)
  }, [])

  const update = useCallback(() => {
    const el = nodeRef.current
    if (el == null) return
    const ratio = el.scrollHeight > el.clientHeight + 1 ? el.clientHeight / el.scrollHeight : 1
    setThumb(ratio >= 1 ? null : { top: (el.scrollTop / el.scrollHeight) * 100, height: Math.max(ratio * 100, 8) })
  }, [])

  useEffect(() => {
    if (node == null) return
    update()
    node.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(node)
    // Rows arrive after the first paint (the catalog is fetched); without this
    // the rail would stay hidden until the user scrolled.
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update)
    mo?.observe(node, { childList: true, subtree: true })
    return () => {
      node.removeEventListener('scroll', update)
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [node, update])

  const jump = useCallback((event: { clientY: number; currentTarget: EventTarget | null }) => {
    const el = nodeRef.current
    const rail = event.currentTarget as HTMLElement | null
    if (el == null || rail == null) return
    const rect = rail.getBoundingClientRect()
    if (rect.height <= 0) return
    el.scrollTop = Math.max(0, (event.clientY - rect.top) / rect.height) * el.scrollHeight
  }, [])

  return { attach, thumb, update, jump }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={box}>
      <div style={caption}>{title}</div>
      {children}
    </div>
  )
}

type WalletPolicyView = {
  mode: 'off' | 'ask' | 'capped'
  perTxMicro: string
  dailyMicro: string
  frozen: boolean
  pending: Array<{ id: string; summary: string; expiresAt: number }>
}

function Page() {
  useLocaleVersion()
  const [status, setStatus] = useState<Status | null>(null)
  const [ollama, setOllama] = useState<OllamaState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pullModel, setPullModel] = useState('')
  const [pull, setPull] = useState<{ status: string; percent?: number } | null>(null)
  const [exported, setExported] = useState<string | null>(null)
  const [walletPolicy, setWalletPolicy] = useState<WalletPolicyView | null>(null)
  const [capPerTx, setCapPerTx] = useState('')
  const [capDaily, setCapDaily] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [pairingLabel, setPairingLabel] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // The draft is seeded once, then owned by the user: a 5-second poll must not
  // overwrite a half-typed price. `save()` reseeds it from the server reply.
  const seeded = useRef(false)
  const models = useScrollThumb()

  const [origin, setOrigin] = useState<string>(originOf(CANDIDATE_PORTS[0]))
  const originRef = useRef(origin)
  originRef.current = origin

  /** A status document from this origin, but only if it belongs to a worker:
   *  the user plugin's bridge answers the same path with role 'user'. */
  const probe = useCallback(async (base: string): Promise<Status | null> => {
    try {
      const res = await fetch(`${base}/genkaku/status`, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      if (!res.ok) return null
      const doc = (await res.json()) as Status
      return doc.role === 'user' ? null : doc
    } catch {
      return null
    }
  }, [])

  const loadStatus = useCallback(async () => {
    let base = originRef.current
    let next = await probe(base)

    if (next == null) {
      for (const port of CANDIDATE_PORTS) {
        const candidate = originOf(port)
        if (candidate === base) continue
        const doc = await probe(candidate)
        if (doc != null) {
          base = candidate
          next = doc
          break
        }
      }
    }

    if (next == null) {
      // A bridge that answers but refuses this window means the plugin predates
      // the desktop app's `dsh-app://app` origin. Say so instead of blaming a
      // missing process, which sends people down the wrong path.
      for (const port of CANDIDATE_PORTS) {
        if (await listening(port)) {
          setError(t(
            `Something answers on 127.0.0.1:${port} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest`,
            `127.0.0.1:${port} 有服務在跑，但拒絕了這個視窗的來源（403）。請更新插件：dsh plugin add @genkaku/dsh-worker-plugin@latest`,
          ))
          return
        }
      }
      setError(t('Worker status unreachable on 47821–47826.'))
      return
    }

    if (base !== originRef.current) setOrigin(base)
    setStatus(next)
    setError(null)
    if (!seeded.current) {
      seeded.current = true
      setDraft(seedDraft(next))
      setNameDraft(next.displayName ?? '')
    }
  }, [probe])

  const claimEarnings = useCallback(async (): Promise<void> => {
    setBusy('claim')
    setError(null)

    try {
      const doc = (await post('/genkaku/wallet/claim', {})) as { tx?: string }
      setNotice(t(
        `Claimed. USDC is in this wallet now${doc.tx == null ? '' : ` (transaction ${doc.tx.slice(0, 12)}…)`}.`,
        `已領取。USDC 已進入這個錢包${doc.tx == null ? '' : `（交易 ${doc.tx.slice(0, 12)}…）`}。`,
      ))
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [loadStatus, t])

  const loadOllama = useCallback(async () => {
    try {
      const res = await fetch(`${originRef.current}/genkaku/ollama`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`ollama ${res.status}`)
      setOllama((await res.json()) as OllamaState)
    } catch {
      // An unreachable worker is already reported by the status poll; Ollama
      // detail is optional and must not blank the panel.
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    void loadOllama()
    const a = setInterval(() => { void loadStatus() }, 5000)
    const b = setInterval(() => { void loadOllama() }, 15000)
    return () => { clearInterval(a); clearInterval(b) }
  }, [loadStatus, loadOllama])

  const post = useCallback(async (path: string, body: unknown): Promise<unknown> => {
    const res = await fetch(`${originRef.current}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const doc = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`)
    return doc
  }, [])

  const get = useCallback(async (path: string): Promise<Record<string, unknown>> => {
    const res = await fetch(`${originRef.current}${path}`, { cache: 'no-store' })
    const doc = (await res.json().catch(() => null)) as (Record<string, unknown> & { error?: { message?: string } }) | null
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`)
    return doc ?? {}
  }, [])

  const loadWalletPolicy = useCallback(async (): Promise<void> => {
    try {
      const doc = await get('/genkaku/wallet/policy')
      const view = doc as unknown as WalletPolicyView
      setWalletPolicy(view)
      setCapPerTx((Number(view.perTxMicro ?? '0') / 1e6).toString())
      setCapDaily((Number(view.dailyMicro ?? '0') / 1e6).toString())
    } catch {
      // The worker half may be restarting.
    }
  }, [get])

  useEffect(() => {
    void loadWalletPolicy()
    const timer = setInterval(() => { void loadWalletPolicy() }, 5000)
    return () => clearInterval(timer)
  }, [loadWalletPolicy])

  const saveWalletPolicy = useCallback(async (patch: Record<string, unknown>): Promise<void> => {
    try {
      const doc = await post('/genkaku/wallet/policy', patch) as Record<string, unknown>
      setWalletPolicy(doc as unknown as WalletPolicyView)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }, [post])

  const decideApproval = useCallback(async (id: string, approve: boolean): Promise<void> => {
    try {
      const doc = await post(approve ? '/genkaku/wallet/approve' : '/genkaku/wallet/deny', { id }) as Record<string, unknown>
      setWalletPolicy(doc.policy as unknown as WalletPolicyView)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }, [post])

  const startOllama = async (): Promise<void> => {
    setBusy('ollama')
    setNotice(null)
    try {
      const next = (await post('/genkaku/ollama', {})) as OllamaState
      setOllama(next)
      setNotice(next.running === true
        ? t('Ollama is running.')
        : (next.error ?? t('Ollama did not start.')))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const pullNow = async (): Promise<void> => {
    const model = pullModel.trim()
    if (model === '') return
    setBusy('pull')
    setNotice(null)
    setPull({ status: t('starting') })
    try {
      const res = await fetch(`${originRef.current}/genkaku/ollama/pull`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
      })
      if (!res.ok || res.body == null) {
        const doc = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(doc?.error?.message ?? `HTTP ${res.status}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim() === '') continue
          const frame = JSON.parse(line) as { status?: string; percent?: number; error?: { message?: string } }
          if (frame.error?.message !== undefined) throw new Error(frame.error.message)
          setPull({
            status: frame.status ?? '',
            ...(frame.percent === undefined ? {} : { percent: frame.percent }),
          })
        }
      }
      setNotice(t('Downloaded {value}.', { value: model }))
      setPullModel('')
      await loadOllama()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
      setPull(null)
    }
  }

  const removeModel = async (model: string): Promise<void> => {
    if (!window.confirm(t('Delete {value} from this machine?', { value: model }))) return
    setBusy(`remove:${model}`)
    try {
      await post('/genkaku/ollama/delete', { model })
      await loadOllama()
      await loadStatus()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const toggleOffer = (model: string): void => {
    setDraft(prev => {
      const next = { ...(prev ?? {}) }
      if (model in next) delete next[model]
      else next[model] = DEFAULT_PRICE
      return next
    })
  }

  const save = async (): Promise<void> => {
    if (draft == null) return
    setSaving(true)
    setNotice(null)
    try {
      // Carry the probed facts across the edit: dropping capabilities/tier here
      // would silently demote every row from offers/1 back to offers/0.
      const known = new Map<string, Offer>()
      for (const entry of status?.offers ?? []) {
        if (typeof entry.offer?.model === 'string') known.set(entry.offer.model, entry.offer)
      }
      const catalog = Object.entries(draft).map(([model, price]) => {
        const n = Number(price)
        if (!Number.isFinite(n) || n < 0) throw new Error(t('Invalid price for {value}', { value: model }))
        const facts = known.get(model)
        return {
          model,
          pricePerHour: usdcToMicro(price),
          ...(facts?.capabilities === undefined ? {} : { capabilities: facts.capabilities }),
          ...(facts?.parameterSize === undefined ? {} : { parameterSize: facts.parameterSize }),
          ...(facts?.tier === undefined ? {} : { tier: facts.tier }),
        }
      })
      const snapshot = (await post('/genkaku/catalog', { catalog })) as Status
      setStatus(snapshot)
      setDraft(seedDraft(snapshot))
      setNotice(t('Saved — your catalog is live.'))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const saveName = async (): Promise<void> => {
    if (nameDraft == null) return
    setBusy('profile:name')
    setNotice(null)
    try {
      const snapshot = (await post('/genkaku/profile', { displayName: nameDraft })) as Status
      setStatus(snapshot)
      setNameDraft(snapshot.displayName ?? '')
      setNotice(t('Name saved. Users see it next to your models, and can sort and search by it.'))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const switchVisibility = async (next: 'public' | 'private'): Promise<void> => {
    const wasPrivate = status?.visibility === 'private'
    if (next === 'private' && !wasPrivate) {
      if (!window.confirm(t('Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?'))) return
    }
    setBusy('profile:visibility')
    setNotice(null)
    try {
      await post('/genkaku/profile', { visibility: next })
      setNotice(next === 'private'
        ? t('Private mode on — restarting the worker. Generate a pairing code below.')
        : t('Public mode on — restarting the worker and rejoining the directory.'))
      setTimeout(() => { void loadStatus() }, 3000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const mintPairing = async (): Promise<void> => {
    setBusy('pairing:create')
    setNotice(null)
    setPairingCode(null)
    try {
      const doc = (await post('/genkaku/pairing', { label: pairingLabel.trim() })) as { code?: string }
      setPairingCode(typeof doc.code === 'string' ? doc.code : null)
      setPairingLabel('')
      setCopied(false)
      await loadStatus()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const copyPairing = async (): Promise<void> => {
    if (pairingCode == null) return
    try {
      await navigator.clipboard.writeText(pairingCode)
      setCopied(true)
      setTimeout(() => { setCopied(false) }, 1500)
    } catch {
      // Clipboard permission can be refused; the code is on screen and
      // selectable, which is the fallback that always works.
      setNotice(t('Copy failed — select the code and copy it manually.'))
    }
  }

  const revokePairing = async (id: string): Promise<void> => {
    setBusy(`pairing:revoke:${id}`)
    try {
      await post('/genkaku/pairing/revoke', { id })
      await loadStatus()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const unpair = async (wallet: string): Promise<void> => {
    if (!window.confirm(t('Stop allowing {value} to use this worker?', { value: shortAddr(wallet) }))) return
    setBusy(`unpair:${wallet}`)
    try {
      const snapshot = (await post('/genkaku/unpair', { wallet })) as Status
      setStatus(snapshot)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const setPublish = async (next: boolean): Promise<void> => {    setBusy('publish')
    setNotice(null)
    try {
      await post('/genkaku/publish', { publish: next })
      setNotice(next
        ? t('Publishing enabled — restarting the worker.')
        : t('Publishing disabled — restarting the worker.'))
      setTimeout(() => { void loadStatus() }, 3000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const exportKey = async (): Promise<void> => {
    setBusy('wallet:export')
    setNotice(null)
    try {
      const doc = (await post('/genkaku/wallet/export', { confirm: true })) as { privateKey?: string }
      setExported(typeof doc.privateKey === 'string' ? doc.privateKey : null)
      setNotice(t('Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.'))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const importKey = async (): Promise<void> => {
    if (!window.confirm(t('Importing a key replaces this worker\'s identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?'))) return
    setBusy('wallet:import')
    setNotice(null)
    try {
      await post('/genkaku/wallet/import', { privateKey: importText.trim() })
      setImportText('')
      setShowImport(false)
      setExported(null)
      setNotice(t('Wallet imported. The worker is restarting with the new identity.'))
      setTimeout(() => { void loadStatus() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const rotateKey = async (): Promise<void> => {
    if (!window.confirm(t('Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.'))) return
    setBusy('wallet:rotate')
    setNotice(null)
    try {
      await post('/genkaku/wallet/new', {})
      setExported(null)
      setNotice(t('New worker wallet generated. Restarting as the new identity.'))
      setTimeout(() => { void loadStatus() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (error != null && status == null) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>{t('GenKaKu worker')}</h2>
        <p style={{ ...dim, marginTop: 8 }}>{error}</p>
        <p style={{ ...dim, fontSize: 12 }}>
          The plugin starts its status server on the first free port in 47821–47826. If another
          dsh profile already owns that port, this one cannot bind it.
        </p>
      </div>
    )
  }
  if (status == null) return <div style={{ padding: 16, ...dim }}>{t('Loading worker status…')}</div>

  const installed = ollama?.models ?? []
  const offered = draft ?? {}
  const tierOf = new Map<string, string>()
  for (const entry of status.offers ?? []) {
    const model = entry.offer?.model
    const tier = entry.offer?.tier
    if (typeof model === 'string' && typeof tier === 'string') tierOf.set(model, tier)
  }

  const names = Array.from(new Set([...Object.keys(offered), ...installed.map(m => m.name)]))
  const sizeOf = new Map(installed.map(m => [m.name, m.sizeBytes]))
  // Offered rows first, then the rest alphabetically: the top of the list is
  // what the worker is actually selling.
  names.sort((a, b) => {
    const ao = a in offered ? 0 : 1
    const bo = b in offered ? 0 : 1
    return ao === bo ? a.localeCompare(b) : ao - bo
  })

  const dirty = draft !== null && draftSignature(offered) !== draftSignature(seedDraft(status))
  // A worker spends SOL on rent and fees and earns USDC; zero SOL is the
  // actionable case.
  // Unknown (the first status reply can precede the balance read) is not zero —
  // showing a faucet prompt to a funded worker would be noise.
  const noGas = (() => {
    if (status.balances?.sol == null) return false
    try { return BigInt(status.balances.sol) === 0n } catch { return false }
  })()
  return (
    <div style={{
      // The host's centre column is `overflow: hidden` + a flex column, so a
      // panel taller than the window is simply cut off — the download box and
      // Save below a 24-model list were unreachable. Fill the column and scroll
      // here instead of relying on the page to scroll.
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 auto',
      minHeight: 0,
      height: '100%',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      padding: 16,
      paddingBottom: 32,
      maxWidth: 760,
    }}>
      <style>{PANEL_CSS}</style>
      <h2 style={{ margin: 0 }}>{t('GenKaKu worker')}</h2>
      <div style={{ ...dim, marginTop: 4 }}>worker · {status.role ?? 'unknown role'}</div>

      {notice != null && (
        <div style={{ ...box, fontSize: 13 }}>{notice}</div>
      )}

      {/* Publishing restarts the worker half, so a poll can fail for a few
          seconds while the status server is being rebound. */}
      {error != null && (
        <div style={{ ...dim, fontSize: 12, marginTop: 8 }}>
          {t('Worker restarting…')} ({error})
        </div>
      )}

      <Section title={t('Wallet')}>
        <div style={row}>
          <span style={dim}>{t('Worker wallet')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <code title={status.wallet}>{shortAddr(status.wallet)}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (status.wallet != null && navigator.clipboard != null) {
                  void navigator.clipboard.writeText(status.wallet)
                  setNotice(t('Wallet address copied.'))
                }
              }}
            >
              {t('copy')}
            </Button>
          </span>
        </div>
        <div style={row}>
          <span style={dim}>{t('Balance')}</span>
          <span>{solFmt(status.balances?.sol)} · {usdcFmt(status.balances?.usdc)}</span>
        </div>
        <div style={row}>
          <span style={dim}>{t('Tips received')}</span>
          <span title={t(TIP_TITLE.en, TIP_TITLE.zh)}>
            {usdcFmt(status.tips?.totalMicro)}
            <span style={{ ...dim, marginLeft: 6 }}>
              {status.tips == null || status.tips.count === 0
                ? t('none yet')
                : t('{value} tips', { value: status.tips.count })}
            </span>
          </span>
        </div>

        {noGas && (
          <div style={{ ...dim, fontSize: 12, marginTop: 8 }}>
            {t('This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.')}{' '}
            <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">
              {t('Open faucet')}
            </a>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void exportKey() }}>
            {busy === 'wallet:export' ? t('Revealing…') : t('Export key')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setShowImport(v => !v)}>
            {t('Import key')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void rotateKey() }}>
            {busy === 'wallet:rotate' ? t('Generating…') : t('New wallet')}
          </Button>
        </div>

        {walletPolicy != null && (
          <div style={{ marginTop: 14, borderTop: '1px solid rgba(127,137,153,.18)', paddingTop: 10 }}>
            <div style={{ ...dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t('Agent access')}</div>
            <div style={row}>
              <span style={dim}>{t('Agent wallet mode')}</span>
              <select
                className="gk-select"
                value={walletPolicy.mode}
                aria-label={t('Agent wallet mode')}
                onChange={e => { void saveWalletPolicy({ mode: e.target.value }) }}
              >
                <option value="off">{t('Off')}</option>
                <option value="ask">{t('Ask owner')}</option>
                <option value="capped">{t('Capped')}</option>
              </select>
            </div>
            {walletPolicy.mode === 'capped' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 6, alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                  {t('Per request (USDC)')}
                  <Input value={capPerTx} onChange={e => setCapPerTx(e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                  {t('Per day (USDC)')}
                  <Input value={capDaily} onChange={e => setCapDaily(e.target.value)} />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const per = Number(capPerTx)
                    const day = Number(capDaily)
                    if (!Number.isFinite(per) || !Number.isFinite(day) || per <= 0 || day <= 0) {
                      setError(t('Enter both limits in USDC.'))
                      return
                    }
                    void saveWalletPolicy({
                      perTxMicro: String(Math.round(per * 1e6)),
                      dailyMicro: String(Math.round(day * 1e6)),
                    })
                  }}
                >
                  {t('Save limits')}
                </Button>
              </div>
            )}
            <div style={{ ...row, marginTop: 6 }}>
              <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, ...dim }}>
                <input
                  type="checkbox"
                  checked={walletPolicy.frozen}
                  onChange={e => { void saveWalletPolicy({ frozen: e.target.checked }) }}
                />
                {t('Freeze wallet')}
              </label>
              {walletPolicy.frozen && (
                <span style={{ fontSize: 11, color: '#ff8b9a' }}>
                  {t('Frozen: owner actions still work; agent requests are refused.')}
                </span>
              )}
            </div>
            <div style={{ ...dim, fontSize: 11, marginTop: 6 }}>
              {t('Key and identity operations are always owner-only.')}{' '}
              {t('Caps apply to tips and campaign funding; claims are not a spend.')}
            </div>
            <div style={{ ...dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, margin: '10px 0 6px' }}>{t('Pending approvals')}</div>
            {walletPolicy.pending.length === 0
              ? <div style={{ ...dim, fontSize: 12 }}>{t('No pending requests.')}</div>
              : walletPolicy.pending.map(request => (
                <div key={request.id} style={{ ...row, alignItems: 'center', gap: 8 }}>
                  <span style={{ minWidth: 0, fontSize: 12 }}>{request.summary}</span>
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <Button variant="primary" size="sm" onClick={() => { void decideApproval(request.id, true) }}>
                      {t('Approve')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { void decideApproval(request.id, false) }}>
                      {t('Deny')}
                    </Button>
                  </span>
                </div>
              ))}
          </div>
        )}

        {exported != null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...dim, fontSize: 12, marginBottom: 4 }}>
              {t('Private key — keep it offline. Testnet only.')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input readOnly value={exported} onFocus={e => e.currentTarget.select()} aria-label={t('Private key')} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (navigator.clipboard != null) {
                    void navigator.clipboard.writeText(exported)
                    setNotice(t('Private key copied.'))
                  }
                }}
              >
                {t('copy')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExported(null)}>{t('hide')}</Button>
            </div>
          </div>
        )}

        {showImport && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...dim, fontSize: 12, marginBottom: 4 }}>
              {t('Paste a base58 wallet key (the format Phantom and solana-keygen show)')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={importText}
                placeholder="base58"
                onChange={e => setImportText(e.target.value)}
                aria-label={t('Private key to import')}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy !== null || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(importText.trim())}
                onClick={() => { void importKey() }}
              >
                {busy === 'wallet:import' ? t('Importing…') : t('Import')}
              </Button>
            </div>
          </div>
        )}

        <div style={{ ...dim, fontSize: 11, marginTop: 10 }}>
          {t('This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.')}
        </div>
      </Section>

      <Section title="Ollama">
        {ollama == null
          ? <div style={dim}>{t('Checking the local Ollama service…')}</div>
          : (
            <>
              <div style={row}>
                <span>
                  <span style={dot(ollama.running === true)} />
                  {ollama.running === true
                    ? t('Running')
                    : ollama.installed === true
                      ? t('Installed, not running')
                      : t('Not installed')}
                  {ollama.version !== undefined && <span style={dim}> · v{ollama.version}</span>}
                  {ollama.running === true && (
                    <span style={dim}> · {installed.length} {t('models')}</span>
                  )}
                </span>
                <span style={dim}><code>{ollama.host ?? '127.0.0.1:11434'}</code></span>
              </div>
              {ollama.running !== true && (
                <div style={{ ...row, justifyContent: 'flex-start', marginTop: 4 }}>
                  {ollama.installed === true
                    ? (
                      <Button variant="primary" size="sm" disabled={busy === 'ollama'} onClick={() => { void startOllama() }}>
                        {busy === 'ollama' ? t('Starting…') : t('Start Ollama')}
                      </Button>
                    )
                    : (
                      <a href={ollama.downloadUrl ?? 'https://ollama.com/download'} target="_blank" rel="noreferrer">
                        <Button variant="primary" size="sm">{t('Download Ollama')}</Button>
                      </a>
                    )}
                </div>
              )}
              {ollama.running !== true && ollama.error !== undefined && (
                <div style={{ ...dim, fontSize: 12, marginTop: 6 }}>{ollama.error}</div>
              )}
            </>
          )}
      </Section>

      {status.visibility !== 'private' && (
      <Section title={t('Directory')}>
        <div style={{ ...row, alignItems: 'center' }}>
          <span>{t('Publish this worker on-chain')}</span>
          <Switch
            checked={status.publishAddress === true}
            disabled={busy === 'publish'
              || status.publishForced === true
              // Honest gate: with no public address there is nothing to list,
              // but an existing opt-in may still be turned off.
              || (status.reachable !== true && status.publishAddress !== true)}
            label={t('Publish this worker on-chain')}
            onChange={(next) => { void setPublish(next) }}
          />
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>
          {status.reachable !== true
            ? t('This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.')
            : status.publishForced === true
              ? t('Forced on by this profile (publishAddress), so it cannot be turned off here.')
              : status.published === true
                ? status.transport === 'relay'
                  ? t('Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.')
                  : t('Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.')
                : status.publishAddress === true
                  ? t('Publishing — the directory write has not landed yet. It retries automatically while the worker runs.')
                : t('Not listed. A public address is available, so turning this on makes you discoverable.')}
        </div>
      </Section>
      )}

      <Section title={t('Name & access')}>
        <div style={{ ...row, alignItems: 'center' }}>
          <span>{t('Display name')}</span>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
            <Input
              value={nameDraft ?? ''}
              placeholder={t('personal name, ID or nickname')}
              aria-label={t('Display name')}
              onChange={e => { setNameDraft(e.target.value) }}
            />
            <Button
              variant="primary"
              size="sm"
              disabled={busy === 'profile:name'
                || nameDraft == null
                || nameDraft.trim() === (status.displayName ?? '').trim()}
              onClick={() => { void saveName() }}
            >
              {busy === 'profile:name' ? t('Saving…') : t('save')}
            </Button>
          </span>
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>
          {t('Users see this next to your models and can search and sort by it. It is not written on chain.')}
        </div>

        <div style={{ ...row, alignItems: 'center', marginTop: 14 }}>
          <span>
            <span style={dot(status.visibility !== 'private')} />
            {status.visibility === 'private' ? t('Private') : t('Public')}
          </span>
          <Switch
            checked={status.visibility === 'private'}
            disabled={busy === 'profile:visibility'}
            label={t('Private worker (pairing code required)')}
            onChange={(next) => { void switchVisibility(next ? 'private' : 'public') }}
          />
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>
          {status.visibility === 'private'
            ? t('Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge — 0 means free.')
            : t('Public: anyone who reads the directory or asks the seed can find these models.')}
        </div>

        {status.visibility === 'private' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ ...row, alignItems: 'center' }}>
              <Input
                value={pairingLabel}
                placeholder={t('label for this user (optional)')}
                aria-label={t('label for this user')}
                onChange={e => { setPairingLabel(e.target.value) }}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy === 'pairing:create'}
                onClick={() => { void mintPairing() }}
              >
                {busy === 'pairing:create'
                  ? t('Generating…')
                  : t('Generate pairing code')}
              </Button>
            </div>

            {pairingCode != null && (
              <div style={{ ...box, marginTop: 8 }}>
                <div style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                  {pairingCode}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <Button size="sm" onClick={() => { void copyPairing() }}>
                    {copied ? t('Copied') : t('Copy code')}
                  </Button>
                  <span style={{ ...dim, fontSize: 12 }}>
                    {t('Shown once. Expires in 15 minutes and pairs one wallet.')}
                  </span>
                </div>
              </div>
            )}

            {(status.pending ?? []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={caption}>{t('Unused codes')}</div>
                {(status.pending ?? []).map(entry => (
                  <div key={entry.id} style={{ ...row, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>{entry.id.slice(0, 8)}</span>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ ...dim, fontSize: 12 }}>
                        {new Date(entry.expiresAt).toLocaleTimeString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === `pairing:revoke:${entry.id}`}
                        onClick={() => { void revokePairing(entry.id) }}
                      >
                        {t('revoke')}
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(status.paired ?? []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={caption}>{t('Paired wallets')}</div>
            {(status.paired ?? []).map(entry => (
              <div key={entry.wallet} style={{ ...row, alignItems: 'center' }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.label ?? shortAddr(entry.wallet)}
                  {entry.label != null && <span style={{ ...dim, fontSize: 12 }}> · {shortAddr(entry.wallet)}</span>}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === `unpair:${entry.wallet}`}
                  onClick={() => { void unpair(entry.wallet) }}
                >
                  {t('unpair')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('Models offered')}>
        <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
          {t('Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.')}
        </div>

        {names.length === 0 && (
          <div style={dim}>
            {t('No local models yet. Download one below.')}
          </div>
        )}

        <div className="gk-models-wrap">
        <div className="gk-models" ref={models.attach} onScroll={models.update}>
        {names.map((name) => {
          const on = name in offered
          const tier = tierOf.get(name)
          return (
            <div key={name} className="gk-row">
              <input
                type="checkbox"
                checked={on}
                aria-label={name}
                onChange={() => { toggleOffer(name) }}
              />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
                {tier !== undefined && (
                  <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>
                    {tier === 'chat' ? t('not for agents') : tier}
                  </span>
                )}
              </span>
              <span className="gk-muted" style={{ textAlign: 'right' }}>{gb(sizeOf.get(name))}</span>
              {on
                ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Input
                      className="gk-price"
                      value={offered[name] ?? ''}
                      inputMode="decimal"
                      aria-label={t('Price per hour for {value}', { value: name })}
                      onChange={e => setDraft({ ...(draft ?? {}), [name]: e.target.value })}
                    />
                    <span className="gk-muted">/h</span>
                  </span>
                )
                : <span />}
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === `remove:${name}`}
                onClick={() => { void removeModel(name) }}
              >
                {t('delete')}
              </Button>
            </div>
          )
        })}
        </div>
        {models.thumb != null && (
          <div
            className="gk-rail"
            aria-hidden="true"
            onPointerDown={e => models.jump(e)}
          >
            <div className="gk-thumb" style={{ top: `${models.thumb.top}%`, height: `${models.thumb.height}%` }} />
          </div>
        )}
        </div>

        <div style={{ ...row, justifyContent: 'flex-start', gap: 8, marginTop: 12 }}>
          <Input
            className="gk-pull"
            value={pullModel}
            placeholder={t('model to download, e.g. llama3.2:3b')}
            aria-label={t('Model to download')}
            onChange={e => setPullModel(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy === 'pull' || pullModel.trim() === ''}
            onClick={() => { void pullNow() }}
          >
            {busy === 'pull' ? t('Downloading…') : t('Download')}
          </Button>
          {pull != null && (
            <span className="gk-muted">
              {pull.status}{pull.percent === undefined ? '' : ` ${Math.round(pull.percent)}%`}
            </span>
          )}
        </div>

        <div style={{ ...row, marginTop: 12, alignItems: 'center' }}>
          <span className="gk-muted">
            {Object.keys(offered).length} {t('offered')}
            {dirty ? ` · ${t('unsaved changes')}` : ''}
          </span>
          <Button variant="primary" size="sm" disabled={saving || !dirty} onClick={() => { void save() }}>
            {saving ? t('Saving…') : t('Save catalog')}
          </Button>
        </div>
      </Section>

      <Section title="Worker">
        <div style={row}><span style={dim}>{t('Peer')}</span><code>{status.peerId ?? '—'}</code></div>
        <div style={row}>
          <span style={dim}>{t('Connection')}</span>
          <span>
            <span style={dot(status.transport === 'direct')} />
            {status.transport === 'direct'
              ? t('libp2p direct')
              : status.transport === 'relay'
                ? t('seed VM relay')
                : t('LAN only')}
          </span>
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>
          {status.transport === 'direct'
            ? t('Clients reach this worker directly over libp2p.')
            : status.transport === 'relay'
              ? t('Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.')
              : t('Only peers on the same network can connect. A relay appears once the seed VM is reachable.')}
        </div>
        <div style={row}>
          <span style={dim}>{t('Active sessions')}</span>
          <span>{status.activeSessions ?? 0}</span>
        </div>
        <div style={row}>
          <span style={dim}>{t('Addresses')}</span>
          <span>{(status.peerAddrs ?? []).length}</span>
        </div>
        <div style={{ ...row, justifyContent: 'flex-start' }}>
          <a href={`${origin}/genkaku`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            {t('Open the full dashboard')}
          </a>
        </div>
      </Section>

      <Section title={t('Language')}>
        <div style={row}>
          <span style={dim}>{t('Language')}</span>
          <select
            className="gk-select"
            value={localeChoice()}
            aria-label={t('Language')}
            onChange={e => setLocaleChoice(e.target.value as ReturnType<typeof localeChoice>)}
          >
            {localeOptions().map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 4 }}>
          {t('Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.')}
        </div>
      </Section>

      <Section title={t('Ad earnings')}>
        <div style={row}>
          <span style={dim}>{t('Ready to claim')}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {usdcFmt(status.balances?.accrued)} USDC
          </span>
        </div>
        <div style={row}>
          <span style={dim}>{t('In this wallet')}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{usdcFmt(status.balances?.usdc)} USDC</span>
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 4 }}>
          {t('Advertisers pay per sponsored minute. Each day’s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.')}
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 4 }}>
          {t('A campaign pays only when its own balance covers the minutes; a worker below that campaign’s claim threshold waits until more accrues.')}
        </div>
        <div style={{ ...row, marginTop: 10, justifyContent: 'flex-start', gap: 8 }}>
          <Button
            variant="primary"
            size="sm"
            disabled={busy !== null || BigInt(status.balances?.accrued ?? '0') === 0n}
            onClick={() => { void claimEarnings() }}
          >
            {busy === 'claim' ? t('Claiming…') : t('Claim')}
          </Button>
          {BigInt(status.balances?.accrued ?? '0') === 0n && (
            <span style={{ ...dim, fontSize: 12 }}>
              {t('Nothing above a threshold yet.')}
            </span>
          )}
        </div>
      </Section>
    </div>
  )
}

export function apply(ctx: ClientContext): void {
  try { installLocale(ctx) } catch (error) { console.error('genkaku i18n:', error) }
  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
  }, Page)), 'genkaku-worker: panel page')

  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 40,
    label: () => 'GenKaKu Worker',
  }, Icon)), 'genkaku-worker: panel entry')
}
