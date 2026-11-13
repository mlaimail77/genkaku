/**
 * GenKaKu network panel: a first-class sidebar entry, not a card buried in the
 * plugins page.
 *
 * The page reads the plugin's own status endpoint on 127.0.0.1 — the same JSON
 * the HTML dashboard uses — so the panel and the dashboard can never disagree.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { Button, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'

const PANEL_ID = 'genkaku-user' as MainPanelId

/** The bridge takes the first free port in this range; the worker plugin's
 *  status server may hold 47821 on a machine that runs both. */
const CANDIDATE_PORTS = [47821, 47822, 47823, 47824, 47825, 47826] as const
const originOf = (port: number): string => `http://127.0.0.1:${port}`

/** True when something answers on that port.
 *
 *  A CORS refusal hides its status code from the real request (the fetch just
 *  rejects), so "nothing is listening" and "a bridge rejected this window" look
 *  identical. An opaque no-cors request still resolves on a 403 and only
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

type OfferWire = {
  model?: string
  workerName?: string
  /** 6-decimal USDC per hour, as a decimal string */
  pricePerHour?: string
  tier?: string
  parameterSize?: string
  capabilities?: string[]
  workerWallet?: string
}

type Status = {
  role?: string
  /** worker addrs the bridge discovered (chain directory + seed) */
  workers?: string[]
  wallet?: string
  url?: string
  env?: string
  /** escrow settlement enabled for this profile */
  settle?: boolean
  balances?: { eth?: string; usdc?: string }
  /** the bridge answers with { addr, offer }, not a flat row */
  offers?: Array<{ addr?: string; offer?: OfferWire }>
  /** addr → how its last session was reached: direct libp2p or the seed relay */
  transports?: Record<string, 'direct' | 'relay'>
  /** worker multiaddrs this profile pins by hand (settings document) */
  manualWorkers?: string[]
}

/** Two languages is enough here: the panel ships with the app, not the site. */
const ZH = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language)
const t = (en: string, zh: string): string => (ZH ? zh : en)

export const inject = ['slots']

import markBlackUrl from './assets/genkaku-mark-b.png'
import markWhiteUrl from './assets/genkaku-mark-w.png'

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

const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' }
const dim: React.CSSProperties = { opacity: 0.6 }
const box: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12, marginTop: 12 }
const caption: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 6 }

/** Always-visible scroll rail: macOS hides native scrollbars until a trackpad
 *  moves, and the network list can hold every model on the network. */
function useScrollThumb() {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null)

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

function Page() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [newWorker, setNewWorker] = useState('')
  const [exported, setExported] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const originRef = useRef<string | null>(null)
  const models = useScrollThumb()

  const load = useCallback(async () => {
    for (const port of CANDIDATE_PORTS) {
      try {
        const res = await fetch(`${originOf(port)}/genkaku/status`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(2500),
        })
        if (!res.ok) continue
        const doc = (await res.json()) as Status
        // The worker status server answers the same path; binding it here would
        // show a worker's numbers in the buyer panel.
        if (doc.role !== 'user') continue
        originRef.current = originOf(port)
        setStatus(doc)
        setError(null)
        return
      } catch {
        // try the next port
      }
    }
    // A bridge that answers but refuses this window means the plugin predates
    // the desktop app's `dsh-app://app` origin. Say so instead of blaming a
    // missing process, which sends people down the wrong path.
    for (const port of CANDIDATE_PORTS) {
      if (await listening(port)) {
        setError(t(
          `Something answers on 127.0.0.1:${port} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest`,
          `127.0.0.1:${port} 有服務在跑，但拒絕了這個視窗的來源（403）。請更新插件：dsh plugin add @genkaku/dsh-user-plugin@latest`,
        ))
        return
      }
    }
    setError(t('No GenKaKu user bridge on 47821–47826.', '47821–47826 上找不到 GenKaKu user bridge。'))
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 5000)
    return () => clearInterval(timer)
  }, [load])

  const post = useCallback(async (path: string, body: unknown): Promise<Record<string, unknown>> => {
    const origin = originRef.current
    if (origin == null) throw new Error(t('Bridge not reached yet.', '尚未連上 bridge。'))
    const res = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const doc = (await res.json().catch(() => null)) as (Record<string, unknown> & { error?: { message?: string } }) | null
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`)
    return doc ?? {}
  }, [])

  const saveWorkers = useCallback(async (next: string[]): Promise<void> => {
    setBusy('workers')
    setNotice(null)
    try {
      await post('/genkaku/settings', { workers: next })
      setNotice(t('Saved. The bridge is restarting with the new worker list.', '已儲存，bridge 正以新的 worker 清單重新啟動。'))
      setTimeout(() => { void load() }, 2500)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  const setSettle = useCallback(async (next: boolean): Promise<void> => {
    setBusy('settle')
    setNotice(null)
    try {
      await post('/genkaku/settings', { settle: next })
      setNotice(next
        ? t('Escrow payments enabled — restarting the bridge.', '已開啟托管付款，bridge 正在重新啟動。')
        : t('Escrow payments disabled — free/dev sessions only. Restarting the bridge.', '已關閉托管付款，僅限免費/開發用 session。bridge 正在重新啟動。'))
      setTimeout(() => { void load() }, 2500)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  const exportKey = useCallback(async (): Promise<void> => {
    setBusy('export')
    setNotice(null)
    try {
      const doc = await post('/genkaku/wallet/export', { confirm: true })
      setExported(typeof doc.privateKey === 'string' ? doc.privateKey : null)
      setNotice(t(
        'Never share this key. Anyone who has it owns the wallet and its funds.',
        '絕對不要分享這把私鑰。拿到它的人就等於擁有這個錢包與裡面的資金。',
      ))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [post])

  const importKey = useCallback(async (): Promise<void> => {
    if (!window.confirm(t(
      'Importing a key replaces this profile\'s user wallet. The current address keeps its funds and is no longer used. Continue?',
      '匯入私鑰會取代此 profile 的使用者錢包。目前位址裡的資金不會轉移，且不再使用。要繼續嗎？',
    ))) return
    setBusy('import')
    setNotice(null)
    try {
      await post('/genkaku/wallet/import', { privateKey: importText.trim() })
      setImportText('')
      setShowImport(false)
      setNotice(t('Wallet imported. The bridge is restarting.', '已匯入錢包，bridge 正在重新啟動。'))
      setTimeout(() => { void load() }, 3000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [importText, load, post])

  const rotateKey = useCallback(async (): Promise<void> => {
    if (!window.confirm(t(
      'Generate a fresh wallet? The old address keeps its ETH and USDC; this profile stops using it.',
      '要產生新的錢包嗎？舊位址的 ETH 與 USDC 會留在原處，此 profile 不再使用它。',
    ))) return
    setBusy('rotate')
    setNotice(null)
    try {
      await post('/genkaku/wallet/new', {})
      setExported(null)
      setNotice(t('New wallet generated. The bridge is restarting.', '已產生新錢包，bridge 正在重新啟動。'))
      setTimeout(() => { void load() }, 3000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  const mintTestUsdc = useCallback(async (): Promise<void> => {
    setBusy('mint')
    setNotice(null)
    try {
      const doc = await post('/genkaku/wallet/mint', { amountUsdc: '100' })
      setNotice(t(`Minted 100 test USDC (tx ${String(doc.tx).slice(0, 12)}…).`, `已領取 100 測試 USDC（tx ${String(doc.tx).slice(0, 12)}…）。`))
      setTimeout(() => { void load() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  const refreshNetwork = useCallback(async (): Promise<void> => {
    setBusy('refresh')
    setNotice(null)
    try {
      await post('/genkaku/settings', { refresh: true })
      setNotice(t(
        'Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.',
        '正在重新掃描鏈上目錄與 seed。掃描完成後 bridge 會重新啟動。',
      ))
      setTimeout(() => { void load() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  if (error != null) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>GenKaKu network</h2>
        <p style={{ ...dim, marginTop: 8 }}>{error}</p>
        <p style={{ ...dim, fontSize: 12 }}>The plugin opens its bridge on the first free port in 47821–47826.</p>
      </div>
    )
  }
  if (status == null) return <div style={{ padding: 16, ...dim }}>Loading worker status…</div>

  const offers = status.offers ?? []
  const price = (micro: string | undefined): string => {
    const n = Number(micro)
    if (!Number.isFinite(n)) return '—'
    return n === 0 ? 'free' : `${(n / 1e6).toFixed(2)} USDC`
  }
  const eth = (wei: string | undefined): string => {
    const n = Number(wei)
    return Number.isFinite(n) ? `${(n / 1e18).toFixed(4)} ETH` : '—'
  }
  const usdc = (micro: string | undefined): string => {
    const n = Number(micro)
    return Number.isFinite(n) ? `${(n / 1e6).toFixed(2)} USDC` : '—'
  }
  const noGas = (() => {
    try { return BigInt(status.balances?.eth ?? '0') === 0n } catch { return true }
  })()
  const short = (addr: string | undefined): string =>
    addr == null || addr.length < 12 ? (addr ?? '—') : `${addr.slice(0, 6)}…${addr.slice(-4)}`
  const wallets = new Set(offers.map(o => o.offer?.workerWallet).filter(w => typeof w === 'string' && w !== ''))
  const workerCount = wallets.size > 0 ? wallets.size : (status.workers ?? []).length

  return (
    <div style={{
      // Same reason as the worker panel: the host column clips, so the panel
      // has to own the scroll or its last cards cannot be reached.
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
      <style>{`
        .gk-net-wrap { position: relative; padding-right: 12px; }
        .gk-net-models { max-height: min(320px, 38vh); overflow-y: auto; scrollbar-width: none; }
        .gk-net-models::-webkit-scrollbar { display: none; }
        .gk-net-rail { position: absolute; top: 2px; bottom: 2px; right: 2px; width: 8px; border-radius: 4px; background: rgba(127,137,153,.16); cursor: pointer; }
        .gk-net-thumb { position: absolute; left: 0; width: 8px; min-height: 16px; border-radius: 4px; background: rgba(127,137,153,.7); }
        .gk-net-rail:hover .gk-net-thumb { background: rgba(127,137,153,.9); }
        .gk-net-row { display: grid; grid-template-columns: minmax(0, 1fr) 92px 116px; gap: 10px; align-items: center; padding: 7px 0; border-top: 0.5px solid rgba(127,137,153,.18); }
        .gk-net-row:first-child { border-top: none; }
      `}</style>

      <h2 style={{ margin: 0 }}>GenKaKu network</h2>
      <div style={{ ...dim, marginTop: 4 }}>user · {status.env ?? 'base-sepolia'}</div>

      {notice != null && <div style={{ ...box, fontSize: 13 }}>{notice}</div>}

      <div style={box}>
        <div style={row}>
          <span style={dim}>{t('Wallet', '錢包')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <code title={status.wallet}>{short(status.wallet)}</code>
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
        <div style={row}><span style={dim}>Balance</span><span>{eth(status.balances?.eth)} · {usdc(status.balances?.usdc)}</span></div>
        <div style={row}><span style={dim}>Payments</span><span>{status.settle === true ? 'escrow enabled' : 'free / dev'}</span></div>
        <div style={row}><span style={dim}>Workers discovered</span><span>{workerCount}</span></div>
        <div style={row}><span style={dim}>Models offered</span><span>{offers.length}</span></div>

        {noGas && (
          <div style={{ ...dim, fontSize: 12, marginTop: 8 }}>
            {t(
              'This wallet has no Base Sepolia ETH yet. Get test ETH for gas from a faucet, then mint test USDC here.',
              '這個錢包還沒有 Base Sepolia ETH。先到 faucet 領測試 ETH 付 gas，再回來領測試 USDC。',
            )}{' '}
            <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" rel="noreferrer">
              {t('Open faucet', '開啟 faucet')}
            </a>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {status.env === 'base-sepolia' && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null || noGas}
              onClick={() => { void mintTestUsdc() }}
            >
              {busy === 'mint' ? t('Minting…', '領取中…') : t('Mint 100 test USDC', '領取 100 測試 USDC')}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void exportKey() }}>
            {busy === 'export' ? t('Revealing…', '讀取中…') : t('Export key', '匯出私鑰')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setShowImport(v => !v)}>
            {t('Import key', '匯入私鑰')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void rotateKey() }}>
            {t('New wallet', '產生新錢包')}
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
                {busy === 'import' ? t('Importing…', '匯入中…') : t('Import', '匯入')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div style={box}>
        <div style={caption}>{t('Settings', '設定')}</div>

        <div style={row}>
          <span>{t('Escrow payments', '托管付款')}</span>
          <Switch
            checked={status.settle === true}
            disabled={busy === 'settle'}
            label={t('Escrow payments', '托管付款')}
            onChange={(next) => { void setSettle(next) }}
          />
        </div>
        <div style={{ ...dim, fontSize: 12 }}>
          {status.settle === true
            ? t(
              'Each session opens a USDC escrow on Base Sepolia and settles per started minute. Needs ETH for gas and USDC in the wallet above.',
              '每個 session 會在 Base Sepolia 開托管並以已開始分鐘結算。上方錢包需要有 ETH 付 gas、以及 USDC。',
            )
            : t(
              'Sessions are free and nothing is signed on-chain. Turn this back on before using the network against real workers.',
              '目前 session 免費、鏈上不簽任何東西。對真實 worker 使用前請重新開啟。',
            )}
        </div>

        <div style={{ ...caption, marginTop: 16 }}>{t('Manual workers', '手動 worker')}</div>
        <div style={{ ...dim, fontSize: 12, marginBottom: 6 }}>
          {t(
            'Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.',
            '可選：固定在此 profile 的 worker multiaddr。鏈上目錄與 seed 的探索仍會自動執行。',
          )}
        </div>

        {(status.manualWorkers ?? []).length === 0
          ? <div style={{ ...dim, fontSize: 12 }}>{t('None pinned — using discovery only.', '沒有固定項目，只用自動探索。')}</div>
          : (status.manualWorkers ?? []).map(addr => (
            <div key={addr} style={{ ...row, gap: 8 }}>
              <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{addr}</code>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === 'workers'}
                onClick={() => { void saveWorkers((status.manualWorkers ?? []).filter(w => w !== addr)) }}
              >
                {t('remove', '移除')}
              </Button>
            </div>
          ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input
            value={newWorker}
            placeholder="/ip4/1.2.3.4/tcp/4001/p2p/12D3Koo…"
            aria-label={t('Worker multiaddr', 'Worker multiaddr')}
            onChange={e => setNewWorker(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy === 'workers' || !newWorker.trim().startsWith('/')}
            onClick={() => {
              const addr = newWorker.trim()
              if (!addr.startsWith('/')) return
              void saveWorkers([...(status.manualWorkers ?? []), addr]).then(() => setNewWorker(''))
            }}
          >
            {t('Add', '新增')}
          </Button>
        </div>

        <div style={{ ...row, marginTop: 14 }}>
          <Button variant="outline" size="sm" disabled={busy === 'refresh'} onClick={() => { void refreshNetwork() }}>
            {busy === 'refresh' ? t('Refreshing…', '重新掃描中…') : t('Refresh network', '重新掃描網路')}
          </Button>
          <span style={{ ...dim, fontSize: 12 }}>{t('Re-reads the directory and the seed now.', '立即重讀鏈上目錄與 seed。')}</span>
        </div>
      </div>

      <div style={box}>
        <div style={{ ...dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Models on the network</div>
        <div className="gk-net-wrap">
        <div className="gk-net-models" ref={models.attach} onScroll={models.update}>
        {offers.length === 0
          ? <p style={{ ...dim, marginBottom: 0 }}>Nothing offered yet. A worker lists its local Ollama models on start.</p>
          : offers.map((entry, i) => {
            const offer = entry.offer ?? {}
            const transport = entry.addr == null ? null : status.transports?.[entry.addr]
            return (
              <div key={`${entry.addr ?? ''}:${offer.model ?? i}`} className="gk-net-row">
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {offer.model ?? 'model name missing'}
                  {offer.tier === 'chat'
                    ? <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>not for agents</span>
                    : offer.tier != null
                      ? <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>{offer.tier}</span>
                      : null}
                </span>
                <span style={{ ...dim, textAlign: 'right', fontSize: 12 }}>{offer.workerName ?? '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 12 }}>
                  {price(offer.pricePerHour)}{' '}
                  <span style={dim}>{transport === 'relay' ? '· via seed VM' : transport === 'direct' ? '· direct' : ''}</span>
                </span>
              </div>
            )
          })}
        </div>
        {models.thumb != null && (
          <div className="gk-net-rail" aria-hidden="true" onPointerDown={e => models.jump(e)}>
            <div className="gk-net-thumb" style={{ top: `${models.thumb.top}%`, height: `${models.thumb.height}%` }} />
          </div>
        )}
        </div>
      </div>

    </div>
  )
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
  }, Page)), 'genkaku-user: panel page')

  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 41,
    label: () => 'GenKaKu User',
  }, Icon)), 'genkaku-user: panel entry')
}
