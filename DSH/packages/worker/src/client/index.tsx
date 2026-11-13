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
export const inject = ['slots']

/** Two languages is enough here: the panel ships with the app, not the site. */
const ZH = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language)
const t = (en: string, zh: string): string => (ZH ? zh : en)

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
  balances?: { eth: string; usdc: string; accrued?: string }
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
const microToUsdc = (value: string | number | undefined): string => {
  const n = Number(value)
  return Number.isFinite(n) ? (n / 1e6).toFixed(2) : DEFAULT_PRICE
}
const usdcToMicro = (value: string): number => Math.round(Number(value) * 1e6)
const gb = (bytes: number | undefined): string =>
  bytes === undefined ? '' : `${(bytes / 1e9).toFixed(1)} GB`
const shortAddr = (addr: string | undefined): string =>
  addr == null || addr === '' ? '—' : `${addr.slice(0, 6)}…${addr.slice(-4)}`
const ethFmt = (wei: string | undefined): string => {
  const n = Number(wei)
  return Number.isFinite(n) ? `${(n / 1e18).toFixed(4)} ETH` : '—'
}
/** USDC carries six decimals and a session bills ~167 micro — two decimals
 *  would print both the earnings and the claim result as "0.00". */
const usdcFmt = (micro: string | undefined): string => {
  const n = Number(micro)
  if (!Number.isFinite(n)) return '—'
  const fixed = (n / 1e6).toFixed(6).replace(/0+$/, '')
  const trimmed = fixed.endsWith('.') ? `${fixed}00` : fixed.length - fixed.indexOf('.') === 2 ? `${fixed}0` : fixed
  return `${trimmed} USDC`
}

const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' }
const dim: CSSProperties = { color: 'var(--dsw-alias-label-tertiary)' }
const caption: CSSProperties = {
  ...dim,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
}
const box: CSSProperties = {
  border: '0.5px solid var(--dsw-alias-border-l2)',
  borderRadius: 'var(--dsw-radius-xl, 12px)',
  background: 'var(--dsw-alias-bg-layer-2, transparent)',
  padding: '12px 16px',
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

function Page() {
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
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')

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
      const res = await fetch(`${base}/genkaku/status`, { cache: 'no-store', signal: AbortSignal.timeout(2500) })
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
      setError(t('Worker status unreachable on 47821–47826.', '47821–47826 上都找不到 worker 狀態服務。'))
      return
    }

    if (base !== originRef.current) setOrigin(base)
    setStatus(next)
    setError(null)
    if (!seeded.current) {
      seeded.current = true
      setDraft(seedDraft(next))
    }
  }, [probe])

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

  const startOllama = async (): Promise<void> => {
    setBusy('ollama')
    setNotice(null)
    try {
      const next = (await post('/genkaku/ollama', {})) as OllamaState
      setOllama(next)
      setNotice(next.running === true
        ? t('Ollama is running.', 'Ollama 已啟動。')
        : (next.error ?? t('Ollama did not start.', 'Ollama 未能啟動。')))
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
    setPull({ status: t('starting', '開始下載') })
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
      setNotice(t(`Downloaded ${model}.`, `已下載 ${model}。`))
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
    if (!window.confirm(t(`Delete ${model} from this machine?`, `要從本機刪除 ${model}？`))) return
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
        if (!Number.isFinite(n) || n < 0) throw new Error(t(`Invalid price for ${model}`, `${model} 的價格無效`))
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
      setNotice(t('Saved — your catalog is live.', '已儲存，目錄已生效。'))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const setPublish = async (next: boolean): Promise<void> => {
    setBusy('publish')
    setNotice(null)
    try {
      await post('/genkaku/publish', { publish: next })
      setNotice(next
        ? t('Publishing enabled — restarting the worker.', '已開啟發佈，worker 正在重啟。')
        : t('Publishing disabled — restarting the worker.', '已關閉發佈，worker 正在重啟。'))
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
      setNotice(t(
        'Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.',
        '絕對不要分享這把私鑰。拿到它的人就等於擁有這個錢包、鏈上目錄裡的 worker 身分，以及它的收入。',
      ))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const importKey = async (): Promise<void> => {
    if (!window.confirm(t(
      'Importing a key replaces this worker\'s identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?',
      '匯入私鑰會取代此 worker 的身分錢包。目前位址裡的資金不會轉移。若舊錢包已在鏈上目錄刊登，此外掛會先嘗試撤銷該條目。要繼續嗎？',
    ))) return
    setBusy('wallet:import')
    setNotice(null)
    try {
      await post('/genkaku/wallet/import', { privateKey: importText.trim() })
      setImportText('')
      setShowImport(false)
      setExported(null)
      setNotice(t('Wallet imported. The worker is restarting with the new identity.', '已匯入錢包，worker 正在以新身分重啟。'))
      setTimeout(() => { void loadStatus() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const rotateKey = async (): Promise<void> => {
    if (!window.confirm(t(
      'Generate a fresh worker wallet? The old address keeps its ETH and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.',
      '要產生新的 worker 錢包嗎？舊位址的 ETH 與 USDC 會留在原處。若舊位址已發佈條目，此外掛會先嘗試撤銷，再以新身分重啟。',
    ))) return
    setBusy('wallet:rotate')
    setNotice(null)
    try {
      await post('/genkaku/wallet/new', {})
      setExported(null)
      setNotice(t('New worker wallet generated. Restarting as the new identity.', '已產生新的 worker 錢包，正在以新身分重啟。'))
      setTimeout(() => { void loadStatus() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const claimEarnings = async (): Promise<void> => {
    setBusy('wallet:claim')
    setNotice(null)
    try {
      const doc = (await post('/genkaku/wallet/claim', {})) as { tx?: string }
      setNotice(doc.tx == null
        ? t('Claim sent.', '已送出提領交易。')
        : t(`Claimed. Transaction ${doc.tx.slice(0, 10)}…`, `已提領。交易 ${doc.tx.slice(0, 10)}…`))
      setTimeout(() => { void loadStatus() }, 2500)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (error != null && status == null) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>GenKaKu worker</h2>
        <p style={{ ...dim, marginTop: 8 }}>{error}</p>
        <p style={{ ...dim, fontSize: 12 }}>
          The plugin starts its status server on the first free port in 47821–47826. If another
          dsh profile already owns that port, this one cannot bind it.
        </p>
      </div>
    )
  }
  if (status == null) return <div style={{ padding: 16, ...dim }}>Loading worker status…</div>

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
  // A worker spends ETH on gas and earns USDC; zero ETH is the actionable case.
  // Unknown (the first status reply can precede the balance read) is not zero —
  // showing a faucet prompt to a funded worker would be noise.
  const noGas = (() => {
    if (status.balances?.eth == null) return false
    try { return BigInt(status.balances.eth) === 0n } catch { return false }
  })()
  // Nothing accrued means nothing to withdraw; a zero-gas wallet cannot pay
  // for the claim transaction, so the button stays off and the hint explains.
  const hasAccrued = (() => {
    if (status.balances?.accrued == null || noGas) return false
    try { return BigInt(status.balances.accrued) > 0n } catch { return false }
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
      <h2 style={{ margin: 0 }}>GenKaKu worker</h2>
      <div style={{ ...dim, marginTop: 4 }}>{status.role ?? 'unknown role'}</div>

      {notice != null && (
        <div style={{ ...box, borderColor: 'var(--dsw-alias-border-l3)' }}>{notice}</div>
      )}

      {/* Publishing restarts the worker half, so a poll can fail for a few
          seconds while the status server is being rebound. */}
      {error != null && (
        <div style={{ ...dim, fontSize: 12, marginTop: 8 }}>
          {t('Worker restarting…', 'worker 正在重啟…')} ({error})
        </div>
      )}

      <Section title="Ollama">
        {ollama == null
          ? <div style={dim}>{t('Checking the local Ollama service…', '正在檢查本機 Ollama 服務…')}</div>
          : (
            <>
              <div style={row}>
                <span>
                  <span style={dot(ollama.running === true)} />
                  {ollama.running === true
                    ? t('Running', '執行中')
                    : ollama.installed === true
                      ? t('Installed, not running', '已安裝，未執行')
                      : t('Not installed', '未安裝')}
                  {ollama.version !== undefined && <span style={dim}> · v{ollama.version}</span>}
                  {ollama.running === true && (
                    <span style={dim}> · {installed.length} {t('models', '個模型')}</span>
                  )}
                </span>
                <span style={dim}><code>{ollama.host ?? '127.0.0.1:11434'}</code></span>
              </div>
              {ollama.running !== true && (
                <div style={{ ...row, justifyContent: 'flex-start', marginTop: 4 }}>
                  {ollama.installed === true
                    ? (
                      <Button variant="primary" size="sm" disabled={busy === 'ollama'} onClick={() => { void startOllama() }}>
                        {busy === 'ollama' ? t('Starting…', '啟動中…') : t('Start Ollama', '啟動 Ollama')}
                      </Button>
                    )
                    : (
                      <a href={ollama.downloadUrl ?? 'https://ollama.com/download'} target="_blank" rel="noreferrer">
                        <Button variant="primary" size="sm">{t('Download Ollama', '下載 Ollama')}</Button>
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

      <Section title={t('Directory', '鏈上目錄')}>
        <div style={{ ...row, alignItems: 'center' }}>
          <span>{t('Publish this worker on-chain', '將此 worker 發佈到鏈上目錄')}</span>
          <Switch
            checked={status.publishAddress === true}
            disabled={busy === 'publish'
              || status.publishForced === true
              // Honest gate: with no public address there is nothing to list,
              // but an existing opt-in may still be turned off.
              || (status.reachable !== true && status.publishAddress !== true)}
            label={t('Publish this worker on-chain', '將此 worker 發佈到鏈上目錄')}
            onChange={(next) => { void setPublish(next) }}
          />
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>
          {status.reachable !== true
            ? t(
              'This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.',
              '這台機器沒有公網位址，因此開關目前無法開啟：發佈只會產生一條沒人連得上的紀錄。同網段的 peer 仍可連線。',
            )
            : status.publishForced === true
              ? t(
                'Forced on by this profile (publishAddress), so it cannot be turned off here.',
                '此 profile 已強制開啟（publishAddress），無法在此關閉。',
              )
              : status.published === true
                ? status.transport === 'relay'
                  ? t(
                    'Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.',
                    '已透過 seed VM 中繼列出。鏈上只會寫入中繼位址，你的公網 IP 不會被公開。',
                  )
                  : t(
                    'Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.',
                    '已列出。你的公網 IP 會寫進鏈上，即使日後關閉，仍然永久可讀。',
                  )
                : status.publishAddress === true
                  ? t(
                    'Publishing — the directory write has not landed yet. It retries automatically while the worker runs.',
                    '發佈中——鏈上寫入尚未完成。worker 執行期間會自動重試。',
                  )
                : t(
                  'Not listed. A public address is available, so turning this on makes you discoverable.',
                  '未列出。這台機器有公網位址，開啟後其他使用者才找得到你。',
                )}
        </div>
      </Section>

      <Section title={t('Models offered', '上架模型')}>
        <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
          {t(
            'Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.',
            '未勾選的模型仍留在本機，但不會上架。價格為每小時 USDC；0 表示免費。',
          )}
        </div>

        {names.length === 0 && (
          <div style={dim}>
            {t('No local models yet. Download one below.', '本機還沒有模型，可在下方下載。')}
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
                    {tier === 'chat' ? t('not for agents', '不適用於 agent') : tier}
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
                      aria-label={t(`Price per hour for ${name}`, `${name} 每小時價格`)}
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
                {t('delete', '刪除')}
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
            placeholder={t('model to download, e.g. llama3.2:3b', '要下載的模型，例如 llama3.2:3b')}
            aria-label={t('Model to download', '要下載的模型')}
            onChange={e => setPullModel(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy === 'pull' || pullModel.trim() === ''}
            onClick={() => { void pullNow() }}
          >
            {busy === 'pull' ? t('Downloading…', '下載中…') : t('Download', '下載')}
          </Button>
          {pull != null && (
            <span className="gk-muted">
              {pull.status}{pull.percent === undefined ? '' : ` ${Math.round(pull.percent)}%`}
            </span>
          )}
        </div>

        <div style={{ ...row, marginTop: 12, alignItems: 'center' }}>
          <span className="gk-muted">
            {Object.keys(offered).length} {t('offered', '個上架')}
            {dirty ? ` · ${t('unsaved changes', '有未儲存的變更')}` : ''}
          </span>
          <Button variant="primary" size="sm" disabled={saving || !dirty} onClick={() => { void save() }}>
            {saving ? t('Saving…', '儲存中…') : t('Save catalog', '儲存目錄')}
          </Button>
        </div>
      </Section>

      <Section title={t('Wallet', '錢包')}>
        <div style={row}>
          <span style={dim}>{t('Worker wallet', 'Worker 錢包')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <code title={status.wallet}>{shortAddr(status.wallet)}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (status.wallet != null && navigator.clipboard != null) {
                  void navigator.clipboard.writeText(status.wallet)
                  setNotice(t('Wallet address copied.', '已複製錢包位址。'))
                }
              }}
            >
              {t('copy', '複製')}
            </Button>
          </span>
        </div>
        <div style={row}><span style={dim}>{t('Gas (ETH)', 'Gas（ETH）')}</span><span>{ethFmt(status.balances?.eth)}</span></div>
        <div style={row}>
          <span style={dim}>{t('Wallet balance (USDC)', '錢包餘額（USDC）')}</span>
          <span>{usdcFmt(status.balances?.usdc)}</span>
        </div>
        <div style={row}>
          {/* Settlement credits `accrued[worker]` inside JobEscrow; that money
              is already the worker's but cannot be spent until it is claimed
              into the wallet, so the claim button lives on this row. */}
          <span style={dim}>{t('Unclaimed in escrow (USDC)', '合約內待提領收入（USDC）')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>{usdcFmt(status.balances?.accrued)}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null || !hasAccrued}
              title={t(
                'Moves the USDC that settlements accrued to this worker out of JobEscrow and into the wallet. The claim is a transaction, so the wallet needs a little ETH for gas.',
                '把結算已記在這個 worker 名下、仍留在 JobEscrow 合約裡的 USDC 領到錢包。提領是一筆交易，所以錢包需要一點 ETH 付 gas。',
              )}
              onClick={() => { void claimEarnings() }}
            >
              {busy === 'wallet:claim'
                ? t('Claiming…', '提領中…')
                : t('Claim', '提領')}
            </Button>
          </span>
        </div>

        {noGas && (
          <div style={{ ...dim, fontSize: 12, marginTop: 8 }}>
            {t(
              'This wallet has no Base Sepolia ETH yet. The worker needs it for gas to publish its listing and settle sessions; USDC is what it earns, not what it spends.',
              '這個錢包還沒有 Base Sepolia ETH。worker 需要它付 gas 才能刊登目錄與結算 session；USDC 是收入，不是支出。',
            )}{' '}
            <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" rel="noreferrer">
              {t('Open faucet', '開啟 faucet')}
            </a>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void exportKey() }}>
            {busy === 'wallet:export' ? t('Revealing…', '讀取中…') : t('Export key', '匯出私鑰')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setShowImport(v => !v)}>
            {t('Import key', '匯入私鑰')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void rotateKey() }}>
            {busy === 'wallet:rotate' ? t('Generating…', '產生中…') : t('New wallet', '產生新錢包')}
          </Button>
        </div>

        {exported != null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...dim, fontSize: 12, marginBottom: 4 }}>
              {t('Private key — keep it offline. Testnet only.', '私鑰——請離線保存。僅限測試網。')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input readOnly value={exported} onFocus={e => e.currentTarget.select()} aria-label={t('Private key', '私鑰')} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (navigator.clipboard != null) {
                    void navigator.clipboard.writeText(exported)
                    setNotice(t('Private key copied.', '已複製私鑰。'))
                  }
                }}
              >
                {t('copy', '複製')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExported(null)}>{t('hide', '隱藏')}</Button>
            </div>
          </div>
        )}

        {showImport && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...dim, fontSize: 12, marginBottom: 4 }}>
              {t('Paste a 0x… 32-byte private key', '貼上 0x… 32 byte 私鑰')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={importText}
                placeholder="0x…"
                onChange={e => setImportText(e.target.value)}
                aria-label={t('Private key to import', '要匯入的私鑰')}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy !== null || !/^(0x)?[0-9a-fA-F]{64}$/.test(importText.trim())}
                onClick={() => { void importKey() }}
              >
                {busy === 'wallet:import' ? t('Importing…', '匯入中…') : t('Import', '匯入')}
              </Button>
            </div>
          </div>
        )}

        <div style={{ ...dim, fontSize: 11, marginTop: 10 }}>
          {t(
            'This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.',
            '這把私鑰就是 worker 身分：用來簽收據、綁定鏈上目錄條目。把這台機器搬到新硬碟前請先備份。',
          )}
        </div>
      </Section>

      <Section title="Worker">
        <div style={row}><span style={dim}>{t('Peer', 'Peer')}</span><code>{status.peerId ?? '—'}</code></div>
        <div style={row}>
          <span style={dim}>{t('Connection', '連線方式')}</span>
          <span>
            <span style={dot(status.transport === 'direct')} />
            {status.transport === 'direct'
              ? t('libp2p direct', 'libp2p 直連')
              : status.transport === 'relay'
                ? t('seed VM relay', 'seed VM 中繼')
                : t('LAN only', '僅限同網段')}
          </span>
        </div>
        <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>
          {status.transport === 'direct'
            ? t(
              'Clients reach this worker directly over libp2p.',
              '使用者透過 libp2p 直接連到這台 worker。',
            )
            : status.transport === 'relay'
              ? t(
                'Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.',
                '這台機器無法被公網直連，因此流量會經由 GenKaKu seed VM 轉送。使用者會先嘗試直連，失敗後才走中繼。',
              )
              : t(
                'Only peers on the same network can connect. A relay appears once the seed VM is reachable.',
                '目前只有同網段的 peer 能連線。連上 seed VM 後會自動取得中繼位址。',
              )}
        </div>
        <div style={row}>
          <span style={dim}>{t('Active sessions', '進行中 session')}</span>
          <span>{status.activeSessions ?? 0}</span>
        </div>
        <div style={row}>
          <span style={dim}>{t('Addresses', '位址數')}</span>
          <span>{(status.peerAddrs ?? []).length}</span>
        </div>
        <div style={{ ...row, justifyContent: 'flex-start' }}>
          <a href={`${origin}/genkaku`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            {t('Open the full dashboard', '開啟完整控制台')}
          </a>
        </div>
      </Section>
    </div>
  )
}

export function apply(ctx: ClientContext): void {
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
