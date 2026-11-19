/**
 * GenKaKu network panel: a first-class sidebar entry, not a card buried in the
 * plugins page.
 *
 * The page reads the plugin's own status endpoint on 127.0.0.1 — the same JSON
 * the HTML dashboard uses — so the panel and the dashboard can never disagree.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { installLocale, localeChoice, localeOptions, setLocaleChoice, t } from './i18n.ts'
import { useLocaleVersion } from './useLocale.tsx'

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { AdDock } from './adDock.tsx'
import { remember } from './bridgeOrigin.ts'

const PANEL_ID = 'genkaku-user' as MainPanelId

/** Offered tip amounts, in whole USDC. A gesture, not a payment tier. */
const TIP_AMOUNTS = [0.5, 1, 2] as const

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
  /** sessions this worker has settled, used by the reputation sort */
  sessionsServed?: number
  /** measured round trip to the offer board, not the model itself */
  latencyMs?: number
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
  balances?: { sol?: string; usdc?: string }
  /** the bridge answers with { addr, offer, key }, not a flat row */
  offers?: Array<{
    addr?: string
    offer?: OfferWire
    /** the (worker, model) id the chat picker sends back */
    key?: string
    visibility?: 'public' | 'private'
    /** the user's label for a private worker */
    workerLabel?: string
    online?: boolean
  }>
  /** addr → how its last session was reached: direct libp2p or the seed relay */
  transports?: Record<string, 'direct' | 'relay'>
  /** worker multiaddrs this profile pins by hand (settings document) */
  manualWorkers?: string[]
  /** chat-picker whitelist; empty means "auto: top N by `sort`" */
  selected?: string[]
  sort?: string
  maxSelected?: number
  privatePeers?: Array<{
    wallet: string
    peerId: string
    label?: string
    online: boolean | null
    pairedAt: number
  }>
}

export const inject = ['slots', 'locale']

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
// The worker panel and this one must look like one product. The border colour
// resolves from the theme: a hard-coded white rgba is invisible on a light
// background, which made every card here look like loose text.
const box: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12))',
  borderRadius: 10,
  padding: 12,
  marginTop: 12,
}
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

type AdListing = {
  id: string
  title: string
  category: string
  priceMicro: string
  campaign: string | null
  review: { verdict?: string; reasons?: string[] } | null
  approved: boolean
  blocked?: boolean
  paused?: boolean
  withdrawableMicro?: string
  active: boolean
  impressions: number
  clicks: number
  remainingMicro?: string
  spent?: boolean
  serving?: boolean
}

type AdsState = { testMode: boolean; listings: AdListing[] }

type WalletPolicyView = {
  mode: 'off' | 'ask' | 'capped'
  perTxMicro: string
  dailyMicro: string
  frozen: boolean
  spentMicro: string
  pending: Array<{ id: string; summary: string; amountMicro: string; action: string; expiresAt: number }>
}

const microOf = (usdc: string): bigint | null => {
  const value = Number(usdc)
  if (!Number.isFinite(value) || value <= 0) return null
  return BigInt(Math.round(value * 1e6))
}

const usdcOf = (micro: string | undefined): string => {
  try {
    const value = Number(BigInt(micro ?? '0')) / 1e6
    return value.toFixed(value < 0.01 ? 4 : 2)
  } catch {
    return '0'
  }
}

function Page() {
  useLocaleVersion()
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [newWorker, setNewWorker] = useState('')
  const [exported, setExported] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [pairText, setPairText] = useState('')
  const [ads, setAds] = useState<AdsState | null>(null)
  const [adCategories, setAdCategories] = useState<string[]>([])
  const [adForm, setAdForm] = useState({
    category: '',
    sponsor: '',
    title: '',
    body: '',
    url: '',
    ctaLabel: '',
    keywords: '',
    imageUrl: '',
    imageAlt: '',
    priceUsdc: '0.005',
    budgetUsdc: '1',
  })
  const [adNotice, setAdNotice] = useState<string | null>(null)
  const [adBusy, setAdBusy] = useState<string | null>(null)
  const [walletPolicy, setWalletPolicy] = useState<WalletPolicyView | null>(null)
  const [capPerTx, setCapPerTx] = useState('')
  const [capDaily, setCapDaily] = useState('')
  const originRef = useRef<string | null>(null)
  /** True once any status has landed: with a panel already on screen, a failed
   *  probe is "reconnecting", never "nothing is running". */
  const haveStatus = useRef(false)
  const models = useScrollThumb()

  const load = useCallback(async () => {
    // Ask the port that answered last time first: the other candidates are cold
    // connections that can only time out.
    const known = originRef.current
    const ports = known == null
      ? [...CANDIDATE_PORTS]
      : [Number(new URL(known).port), ...CANDIDATE_PORTS.filter(port => originOf(port) !== known)]

    for (const port of ports) {
      try {
        const res = await fetch(`${originOf(port)}/genkaku/status`, {
          cache: 'no-store',
          // A cold bridge (libp2p dialing the seed, first RPC reads) can take a
          // moment. Giving up at 2.5 s turned a slow status into "no bridge",
          // which sent people looking for a process that was running all along.
          signal: AbortSignal.timeout(6000),
        })
        if (!res.ok) continue
        const doc = (await res.json()) as Status
        // The worker status server answers the same path; binding it here would
        // show a worker's numbers in the buyer panel.
        if (doc.role !== 'user') continue
        originRef.current = originOf(port)
        remember(originOf(port))
        haveStatus.current = true
        setStatus(doc)
        setError(null)
        return
      } catch {
        // try the next port
      }
    }

    // Nothing answered in time. If the panel is already showing figures, keep
    // them and say we are reconnecting — blanking the page for one slow poll is
    // what made this feel like a crash.
    if (haveStatus.current) {
      setError(t('Reconnecting to the bridge…'))
      return
    }

    // A bridge that answers but refuses this window means the plugin predates
    // the desktop app's `dsh-app://app` origin. Say so instead of blaming a
    // missing process, which sends people down the wrong path.
    for (const port of CANDIDATE_PORTS) {
      if (await listening(port)) {
        setError(t(
          "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest",
          { value: port },
        ))
        return
      }
    }
    setError(t('No GenKaKu user bridge on 47821–47826.'))
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 5000)
    return () => clearInterval(timer)
  }, [load])

  const post = useCallback(async (path: string, body: unknown): Promise<Record<string, unknown>> => {
    const origin = originRef.current
    if (origin == null) throw new Error(t('Bridge not reached yet.'))
    const res = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const doc = (await res.json().catch(() => null)) as (Record<string, unknown> & { error?: { message?: string } }) | null
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`)
    return doc ?? {}
  }, [])

  const get = useCallback(async (path: string): Promise<Record<string, unknown>> => {
    const origin = originRef.current
    if (origin == null) throw new Error(t('Bridge not reached yet.'))
    const res = await fetch(`${origin}${path}`, { cache: 'no-store' })
    const doc = (await res.json().catch(() => null)) as (Record<string, unknown> & { error?: { message?: string } }) | null
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`)
    return doc ?? {}
  }, [t])

  const loadWalletPolicy = useCallback(async (): Promise<void> => {
    try {
      const doc = await get('/genkaku/wallet/policy')
      const view = doc as unknown as WalletPolicyView
      setWalletPolicy(view)
      setCapPerTx((Number(view.perTxMicro ?? '0') / 1e6).toString())
      setCapDaily((Number(view.dailyMicro ?? '0') / 1e6).toString())
    } catch {
      // A bridge before 0.5 has no policy route; the card stays hidden.
    }
  }, [get])

  useEffect(() => {
    void loadWalletPolicy()
    const timer = setInterval(() => { void loadWalletPolicy() }, 5000)
    return () => clearInterval(timer)
  }, [loadWalletPolicy])

  const saveWalletPolicy = useCallback(async (patch: Record<string, unknown>): Promise<void> => {
    try {
      const doc = await post('/genkaku/wallet/policy', patch)
      setWalletPolicy(doc as unknown as WalletPolicyView)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }, [post])

  const decideApproval = useCallback(async (id: string, approve: boolean): Promise<void> => {
    try {
      const doc = await post(approve ? '/genkaku/wallet/approve' : '/genkaku/wallet/deny', { id })
      setWalletPolicy(doc.policy as unknown as WalletPolicyView)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }, [post])

  const loadAds = useCallback(async (): Promise<void> => {
    try {
      const [mine, catalog] = await Promise.all([
        get('/genkaku/ads/mine'),
        get('/genkaku/ads/categories').catch(() => ({ categories: [] })),
      ])
      setAds({
        testMode: mine.testMode === true,
        listings: Array.isArray(mine.listings) ? mine.listings as AdListing[] : [],
      })
      const categories = Array.isArray(catalog.categories) ? catalog.categories as string[] : []
      setAdCategories(categories)
      setAdForm(form => form.category === '' && categories.length > 0 ? { ...form, category: categories[0]! } : form)
    } catch {
      // A bridge that predates 0.4 does not have these routes; the card simply
      // stays empty rather than showing an error the user cannot act on.
    }
  }, [get])

  const createListing = useCallback(async (): Promise<void> => {
    setAdBusy('create')
    setAdNotice(null)
    try {
      const priceMicro = microOf(adForm.priceUsdc)
      if (priceMicro == null) throw new Error(t('Enter a price per impression.'))
      if (priceMicro < 100n || priceMicro > 100_000n) {
        throw new Error(t('Price must be between 0.0001 and 0.1 USDC per impression.'))
      }

      const doc = await post('/genkaku/ads/listing', {
        category: adForm.category,
        sponsor: adForm.sponsor,
        title: adForm.title,
        body: adForm.body,
        url: adForm.url,
        ctaLabel: adForm.ctaLabel,
        keywords: adForm.keywords,
        imageUrl: adForm.imageUrl,
        imageAlt: adForm.imageAlt,
        priceMicro: priceMicro.toString(),
      })

      const review = doc.review as { verdict?: string; reasons?: string[] } | undefined
      if (review?.verdict === 'ok') {
        setAdNotice(t('Submitted and reviewed. Fund it and it goes live; the operator can block it later.'))
      } else {
        setAdNotice(t('Not accepted: {value}', {
          value: (review?.reasons ?? []).join(' · ') || review?.verdict || 'review failed',
        }))
      }
      setAdForm(form => ({ ...form, title: '', body: '', url: '', ctaLabel: '', imageUrl: '', imageAlt: '', keywords: '' }))
      await loadAds()
    } catch (error) {
      setAdNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setAdBusy(null)
    }
  }, [adForm, loadAds, post, t])

  const pauseListing = useCallback(async (listing: AdListing): Promise<void> => {
    if (listing.campaign == null) return
    setAdBusy(`pause:${listing.id}`)
    setAdNotice(null)
    try {
      await post('/genkaku/ads/pause', {
        id: listing.id,
        campaign: listing.campaign,
        paused: listing.paused !== true,
      })
      setAdNotice(listing.paused === true
        ? t('Resumed. The ad is serving again.')
        : t('Paused. No new impressions; unspent budget can be withdrawn after a day.'))
      await loadAds()
    } catch (error) {
      setAdNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setAdBusy(null)
    }
  }, [loadAds, post, t])

  const withdrawListing = useCallback(async (listing: AdListing): Promise<void> => {
    if (listing.campaign == null) return
    setAdBusy(`withdraw:${listing.id}`)
    setAdNotice(null)
    try {
      const done = await post('/genkaku/ads/withdraw', { campaign: listing.campaign })
      const amount = typeof done.amount === 'string' ? usdcOf(done.amount) : '0'
      setAdNotice(t('Withdrew {value} USDC back to the wallet.', { value: amount }))
      await loadAds()
    } catch (error) {
      setAdNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setAdBusy(null)
    }
  }, [loadAds, post, t])

  const fundListing = useCallback(async (listing: AdListing): Promise<void> => {
    setAdBusy(`fund:${listing.id}`)
    setAdNotice(null)
    try {
      const price = BigInt(listing.priceMicro)
      const budget = microOf(adForm.budgetUsdc)
      if (budget == null) throw new Error(t('Enter a budget.'))
      if (budget < price) throw new Error(t('The budget must cover at least one impression.'))

      const walletUsdc = BigInt(status?.balances?.usdc ?? '0')
      if (budget > walletUsdc) throw new Error(t('Budget exceeds the wallet balance.'))

      const { index } = await get('/genkaku/ads/index') as { index: number }
      const funded = await post('/genkaku/ads/fund', {
        index,
        priceMicro: price.toString(),
        budgetMicro: budget.toString(),
        // A campaign whose whole budget is below the usual 0.05 threshold could
        // never be claimed. Cap the threshold at the budget so every campaign is
        // payable once it is spent.
        minClaimMicro: (budget < 50_000n ? budget : 50_000n).toString(),
      })
      const campaign = typeof funded.campaign === 'string' ? funded.campaign : ''
      if (campaign === '') throw new Error(t('The campaign address was not returned.'))

      await post('/genkaku/ads/attach', { id: listing.id, campaign })
      setAdNotice(t('Funded and attached. The ad is live.'))
      await loadAds()
    } catch (error) {
      setAdNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setAdBusy(null)
    }
  }, [adForm.budgetUsdc, get, loadAds, post, status?.balances?.usdc, t])

  useEffect(() => {
    if (status != null) void loadAds()
  }, [status?.wallet, loadAds])

  const saveWorkers = useCallback(async (next: string[]): Promise<void> => {
    setBusy('workers')
    setNotice(null)
    try {
      await post('/genkaku/settings', { workers: next })
      setNotice(t('Saved. The bridge is restarting with the new worker list.'))
      setTimeout(() => { void load() }, 2500)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  const sendTipTo = useCallback(async (worker: string, usdc: number): Promise<void> => {
    setBusy(`tip:${worker}`)
    setNotice(null)
    try {
      const doc = await post('/genkaku/tip', { worker, micro: String(Math.round(usdc * 1e6)) })
      const signature = typeof doc.signature === 'string' ? doc.signature : ''
      setNotice(t(
        `Tipped ${usdc} USDC. ${signature === '' ? '' : `Transaction ${signature}`}`,
        `已打賞 ${usdc} USDC。${signature === '' ? '' : `交易 ${signature}`}`,
      ))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [post, t])

  const exportKey = useCallback(async (): Promise<void> => {    setBusy('export')
    setNotice(null)
    try {
      const doc = await post('/genkaku/wallet/export', { confirm: true })
      setExported(typeof doc.privateKey === 'string' ? doc.privateKey : null)
      setNotice(t('Never share this key. Anyone who has it owns the wallet and its funds.'))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [post])

  const importKey = useCallback(async (): Promise<void> => {
    if (!window.confirm(t('Importing a key replaces this profile\'s user wallet. The current address keeps its funds and is no longer used. Continue?'))) return
    setBusy('import')
    setNotice(null)
    try {
      await post('/genkaku/wallet/import', { privateKey: importText.trim() })
      setImportText('')
      setShowImport(false)
      setNotice(t('Wallet imported. The bridge is restarting.'))
      setTimeout(() => { void load() }, 3000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [importText, load, post])

  const rotateKey = useCallback(async (): Promise<void> => {
    if (!window.confirm(t('Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.'))) return
    setBusy('rotate')
    setNotice(null)
    try {
      await post('/genkaku/wallet/new', {})
      setExported(null)
      setNotice(t('New wallet generated. The bridge is restarting.'))
      setTimeout(() => { void load() }, 3000)
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
      setNotice(t('Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.'))
      setTimeout(() => { void load() }, 4000)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  /** The picked list and its order live in the bridge, because the chat model
   *  picker reads the same document. Local state would drift from the picker. */
  const savePrefs = useCallback(async (patch: { selected?: string[]; sort?: string }): Promise<void> => {
    setBusy('prefs')
    setNotice(null)
    try {
      await post('/genkaku/settings', patch)
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  const toggleModel = useCallback((key: string): void => {
    if (status == null) return
    const current = status.selected ?? []
    const max = status.maxSelected ?? 10
    if (current.includes(key)) {
      void savePrefs({ selected: current.filter(item => item !== key) })
      return
    }
    if (current.length >= max) {
      setNotice(t('At most {value} models can be selected. Untick one first.', { value: max }))
      return
    }
    void savePrefs({ selected: [...current, key] })
  }, [savePrefs, status])

  const pairWorker = useCallback(async (): Promise<void> => {
    const token = pairText.trim()
    if (token === '') return
    setBusy('pair')
    setNotice(null)
    try {
      await post('/genkaku/pair', { token })
      setPairText('')
      setNotice(t('Paired. The worker’s models appear below when it is online.'))
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, pairText, post])

  const unpairWorker = useCallback(async (wallet: string): Promise<void> => {
    if (!window.confirm(t('Forget this paired worker? You can pair it again with a fresh code.'))) return
    setBusy(`unpair:${wallet}`)
    setNotice(null)
    try {
      await post('/genkaku/unpair', { wallet })
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [load, post])

  if (error != null && status == null) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>{t('GenKaKu network')}</h2>
        <p style={{ ...dim, marginTop: 8 }}>{error}</p>
        <p style={{ ...dim, fontSize: 12 }}>{t('The plugin opens its bridge on the first free port in 47821–47826.')}</p>
      </div>
    )
  }
  if (status == null) return <div style={{ padding: 16, ...dim }}>{t('Loading status…')}</div>

  const offers = status.offers ?? []
  const price = (micro: string | undefined): string => {
    const n = Number(micro)
    if (!Number.isFinite(n)) return '—'
    return n === 0 ? 'free' : `${(n / 1e6).toFixed(2)} USDC`
  }
  const sol = (lamports: string | undefined): string => {
    const n = Number(lamports)
    return Number.isFinite(n) ? `${(n / 1e9).toFixed(4)} SOL` : '—'
  }
  const usdc = (micro: string | undefined): string => {
    const n = Number(micro)
    return Number.isFinite(n) ? `${(n / 1e6).toFixed(2)} USDC` : '—'
  }
  const noGas = (() => {
    try { return BigInt(status.balances?.sol ?? '0') === 0n } catch { return true }
  })()
  const short = (addr: string | undefined): string =>
    addr == null || addr.length < 12 ? (addr ?? '—') : `${addr.slice(0, 6)}…${addr.slice(-4)}`
  const wallets = new Set(offers.map(o => o.offer?.workerWallet).filter(w => typeof w === 'string' && w !== ''))
  const workerCount = wallets.size > 0 ? wallets.size : (status.workers ?? []).length
  const maxSelected = status.maxSelected ?? 10
  const selected = status.selected ?? []
  const selectedSet = new Set(selected)
  const query = search.trim().toLowerCase()
  const visible = query === ''
    ? offers
    : offers.filter((entry) => {
      const offer = entry.offer ?? {}
      return `${entry.workerLabel ?? offer.workerName ?? ''} ${offer.model ?? ''} ${offer.workerWallet ?? ''}`
        .toLowerCase()
        .includes(query)
    })
  // A saved choice can outlive the worker that offered it (or the model can be
  // uninstalled). Say so instead of leaving a picker row that silently vanished.
  const stale = selected.filter(key => !offers.some(entry => entry.key === key)).length
  const privatePeers = status.privatePeers ?? []

  // One row per worker wallet: a worker offering four models should not ask to
  // be tipped four times.
  const tipWorkers = (() => {
    const byWallet = new Map<string, { wallet: string; name: string; models: string[] }>()

    for (const entry of offers) {
      const wallet = entry.offer?.workerWallet
      if (wallet == null || wallet === '') continue

      const row = byWallet.get(wallet) ?? {
        wallet,
        name: entry.workerLabel ?? entry.offer?.workerName ?? short(wallet),
        models: [],
      }
      const model = entry.offer?.model
      if (model != null && model !== '' && !row.models.includes(model)) row.models.push(model)
      byWallet.set(wallet, row)
    }

    return [...byWallet.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8)
  })()

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
        .gk-net-row { display: grid; grid-template-columns: 20px minmax(0, 1fr) 92px 116px; gap: 10px; align-items: center; padding: 7px 0; border-top: 0.5px solid rgba(127,137,153,.18); }
        .gk-net-row:first-child { border-top: none; }
        .gk-select { background: transparent; color: inherit; border: 1px solid rgba(127,137,153,.35); border-radius: 6px; padding: 4px 6px; font: inherit; font-size: 12px; }
      `}</style>

      <h2 style={{ margin: 0 }}>{t('GenKaKu network')}</h2>
      <div style={{ ...dim, marginTop: 4 }}>user · {status.env ?? 'solana-devnet'}</div>

      {error != null && (
        <div style={{ ...box, fontSize: 13 }}>
          <span style={{ ...dim }}>{t('Reconnecting…')}</span> ({error})
        </div>
      )}

      {notice != null && <div style={{ ...box, fontSize: 13 }}>{notice}</div>}

      <div style={box}>
        <div style={row}>
          <span style={dim}>{t('Wallet')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <code title={status.wallet}>{short(status.wallet)}</code>
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
        <div style={row}><span style={dim}>{t('Balance')}</span><span>{sol(status.balances?.sol)} · {usdc(status.balances?.usdc)}</span></div>
        <div style={row}><span style={dim}>{t('Sessions')}</span><span>{t('free · tips optional')}</span></div>
        <div style={row}><span style={dim}>{t('Workers discovered')}</span><span>{workerCount}</span></div>
        <div style={row}><span style={dim}>{t('Models offered')}</span><span>{offers.length}</span></div>

        {noGas && (
          <div style={{ ...dim, fontSize: 12, marginTop: 8 }}>
            {t('This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.')}{' '}
            <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">
              {t('Open faucet (devnet)')}
            </a>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void exportKey() }}>
            {busy === 'export' ? t('Revealing…') : t('Export key')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setShowImport(v => !v)}>
            {t('Import key')}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { void rotateKey() }}>
            {t('New wallet')}
          </Button>
        </div>

        {walletPolicy != null && (
          <div style={{ marginTop: 14, borderTop: '1px solid rgba(127,137,153,.18)', paddingTop: 10 }}>
            <div style={caption}>{t('Agent access')}</div>
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
                    const per = microOf(capPerTx)
                    const day = microOf(capDaily)
                    if (per == null || day == null) {
                      setNotice(t('Enter both limits in USDC.'))
                      return
                    }
                    void saveWalletPolicy({ perTxMicro: per.toString(), dailyMicro: day.toString() })
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

            <div style={{ ...caption, marginTop: 10 }}>{t('Pending approvals')}</div>
            {walletPolicy.pending.length === 0
              ? <div style={{ ...dim, fontSize: 12 }}>{t('No pending requests.')}</div>
              : walletPolicy.pending.map(request => (
                <div key={request.id} style={{ ...row, alignItems: 'center', gap: 8 }}>
                  <span style={{ minWidth: 0, fontSize: 12 }}>
                    {request.summary}
                    <span style={{ ...dim, fontSize: 11 }}>
                      {' · '}{new Date(request.expiresAt).toLocaleTimeString()}
                    </span>
                  </span>
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
                {busy === 'import' ? t('Importing…') : t('Import')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div style={box}>
        <div style={caption}>{t('Tips')}</div>
        <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
          {t('Using GenKaKu costs nothing. If a worker was useful — especially a free one, which earns no advertising revenue — you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.')}
        </div>

        {tipWorkers.length === 0
          ? <div style={{ ...dim, fontSize: 12 }}>{t('No worker with a wallet on the board yet.')}</div>
          : tipWorkers.map(worker => (
            <div key={worker.wallet} style={{ ...row, gap: 8, alignItems: 'center' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {worker.name}
                <span style={{ ...dim, fontSize: 11 }}>{' · '}{worker.models.join(', ')}</span>
              </span>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                {TIP_AMOUNTS.map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => { void sendTipTo(worker.wallet, amount) }}
                  >
                    {busy === `tip:${worker.wallet}` ? '…' : `${amount} USDC`}
                  </Button>
                ))}
              </span>
            </div>
          ))}
        <div style={{ ...dim, fontSize: 11, marginTop: 8 }}>
          {t('Each tip needs a little SOL in the wallet above for the network fee.')}
        </div>
      </div>

      <div style={box}>
        <div style={caption}>{t('Settings')}</div>

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

        <div style={{ ...caption, marginTop: 16 }}>{t('Manual workers')}</div>
        <div style={{ ...dim, fontSize: 12, marginBottom: 6 }}>
          {t('Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.')}
        </div>

        {(status.manualWorkers ?? []).length === 0
          ? <div style={{ ...dim, fontSize: 12 }}>{t('None pinned — using discovery only.')}</div>
          : (status.manualWorkers ?? []).map(addr => (
            <div key={addr} style={{ ...row, gap: 8 }}>
              <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{addr}</code>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === 'workers'}
                onClick={() => { void saveWorkers((status.manualWorkers ?? []).filter(w => w !== addr)) }}
              >
                {t('remove')}
              </Button>
            </div>
          ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input
            value={newWorker}
            placeholder="/ip4/1.2.3.4/tcp/4001/p2p/12D3Koo…"
            aria-label={t('Worker multiaddr')}
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
            {t('Add')}
          </Button>
        </div>

        <div style={{ ...row, marginTop: 14 }}>
          <Button variant="outline" size="sm" disabled={busy === 'refresh'} onClick={() => { void refreshNetwork() }}>
            {busy === 'refresh' ? t('Refreshing…') : t('Refresh network')}
          </Button>
          <span style={{ ...dim, fontSize: 12 }}>{t('Re-reads the directory and the seed now.')}</span>
        </div>
      </div>

      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ ...dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{t('Models on the network')}</div>
          <span style={{ ...dim, fontSize: 12 }}>{selected.length}/{maxSelected} {t('selected')}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
          <Input
            value={search}
            placeholder={t('Search a model, worker name or wallet')}
            aria-label={t('Search models')}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="gk-select"
            value={status.sort ?? 'recommended'}
            aria-label={t('Sort models')}
            disabled={busy === 'prefs'}
            onChange={e => { void savePrefs({ sort: e.target.value }) }}
          >
            <option value="recommended">{t('Recommended')}</option>
            <option value="pricePerHour">{t('Lowest price')}</option>
            <option value="latencyMs">{t('Lowest latency')}</option>
            <option value="sessionsServed">{t('Most sessions served')}</option>
            <option value="model">{t('Model name')}</option>
            <option value="workerName">{t('Worker name')}</option>
          </select>
        </div>

        <div style={{ ...dim, fontSize: 12, marginBottom: 6 }}>
          {t('Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.')}
        </div>
        {stale > 0 && (
          <div style={{ ...dim, fontSize: 12, marginBottom: 6 }}>
            {t('{value} ticked model(s) are not on the network right now. They come back when their worker does.', { value: stale })}
          </div>
        )}

        <div className="gk-net-wrap">
        <div className="gk-net-models" ref={models.attach} onScroll={models.update}>
        {visible.length === 0
          ? (
            <p style={{ ...dim, marginBottom: 0 }}>
              {offers.length === 0
                ? t('Nothing offered yet. A worker lists its local Ollama models on start.')
                : t('No row matches that search.')}
            </p>
          )
          : visible.map((entry, i) => {
            const offer = entry.offer ?? {}
            const key = entry.key ?? `${entry.addr ?? ''}|${offer.model ?? i}`
            const transport = entry.addr == null ? null : status.transports?.[entry.addr]
            const workerLabel = entry.workerLabel ?? offer.workerName ?? '—'
            return (
              <div key={key} className="gk-net-row">
                <input
                  type="checkbox"
                  checked={selectedSet.has(key)}
                  aria-label={`${workerLabel} · ${offer.model ?? ''}`}
                  disabled={busy === 'prefs'}
                  onChange={() => { toggleModel(key) }}
                />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {offer.model ?? 'model name missing'}
                  {offer.tier === 'chat'
                    ? <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>not for agents</span>
                    : offer.tier != null
                      ? <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>{offer.tier}</span>
                      : null}
                  {entry.visibility === 'private' && (
                    <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>· {t('private')}</span>
                  )}
                </span>
                <span style={{ ...dim, textAlign: 'right', fontSize: 12 }}>{workerLabel}</span>
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

      <div style={box}>
        <div style={{ ...dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          {t('Private workers')}
        </div>
        <div style={{ ...dim, fontSize: 12, margin: '6px 0 8px' }}>
          {t('A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.')}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={pairText}
            placeholder="genkaku1.…"
            aria-label={t('Pairing code')}
            onChange={e => setPairText(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={busy === 'pair' || pairText.trim() === ''}
            onClick={() => { void pairWorker() }}
          >
            {busy === 'pair' ? t('Pairing…') : t('Pair')}
          </Button>
        </div>

        {privatePeers.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {privatePeers.map(peer => (
              <div key={peer.wallet} style={{ ...row, alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 8,
                    marginRight: 8,
                    background: peer.online === true
                      ? '#34a853'
                      : peer.online === false ? 'rgba(127,137,153,.6)' : 'transparent',
                    border: peer.online === null ? '1px dashed rgba(127,137,153,.6)' : 'none',
                  }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {peer.label ?? short(peer.wallet)}
                    <span style={{ ...dim, fontSize: 12 }}>
                      {' · '}
                      {peer.online === true
                        ? t('online')
                        : peer.online === false ? t('offline') : t('checking…')}
                    </span>
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === `unpair:${peer.wallet}`}
                  onClick={() => { void unpairWorker(peer.wallet) }}
                >
                  {t('forget')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={box}>
        <div style={{ ...caption, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>{t('Advertise on GenKaKu')}</span>
          <Button variant="ghost" size="sm" disabled={adBusy !== null} onClick={() => { void loadAds() }}>
            {t('refresh')}
          </Button>
        </div>
        <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
          {t('You pay per impression: one impression is one sponsored minute of a worker’s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.')}
        </div>

        {ads?.testMode === true && (
          <div style={{ fontSize: 12, color: '#e8b04b', marginBottom: 8 }}>
            {t('Test mode: a zero budget still serves, and impressions are not billed.')}
          </div>
        )}

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
            {t('Category')}
            <select
              className="gk-select"
              value={adForm.category}
              onChange={e => setAdForm({ ...adForm, category: e.target.value })}
            >
              {adCategories.length === 0
                ? <option value="">—</option>
                : adCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
            {t('Sponsor name')}
            <Input value={adForm.sponsor} onChange={e => setAdForm({ ...adForm, sponsor: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
            {t('Price per impression (USDC)')}
            <Input value={adForm.priceUsdc} onChange={e => setAdForm({ ...adForm, priceUsdc: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
            {t('Budget (USDC)')}
            <Input value={adForm.budgetUsdc} onChange={e => setAdForm({ ...adForm, budgetUsdc: e.target.value })} />
          </label>
        </div>

        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
            {t('Title')}
            <Input value={adForm.title} onChange={e => setAdForm({ ...adForm, title: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
            {t('Body')}
            <Input value={adForm.body} onChange={e => setAdForm({ ...adForm, body: e.target.value })} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
              {t('Destination URL')}
              <Input value={adForm.url} placeholder="https://" onChange={e => setAdForm({ ...adForm, url: e.target.value })} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
              {t('Button label')}
              <Input value={adForm.ctaLabel} placeholder={t('Learn more')} onChange={e => setAdForm({ ...adForm, ctaLabel: e.target.value })} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
              {t('Image URL')}
              <Input value={adForm.imageUrl} placeholder="https://" onChange={e => setAdForm({ ...adForm, imageUrl: e.target.value })} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
              {t('Image alt')}
              <Input value={adForm.imageAlt} onChange={e => setAdForm({ ...adForm, imageAlt: e.target.value })} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, alignContent: 'start' }}>
              {t('Keywords')}
              <Input value={adForm.keywords} placeholder="typescript, refactor" onChange={e => setAdForm({ ...adForm, keywords: e.target.value })} />
            </label>
          </div>
        </div>

        <div style={{ ...row, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button
            variant="primary"
            size="sm"
            disabled={adBusy !== null || adForm.category === '' || adForm.title.trim() === '' || adForm.keywords.trim() === ''}
            onClick={() => { void createListing() }}
          >
            {adBusy === 'create' ? t('Submitting…') : t('Submit for review')}
          </Button>
        </div>

        {adNotice != null && (
          <div style={{ fontSize: 12, marginTop: 8, whiteSpace: 'pre-wrap' }}>{adNotice}</div>
        )}

        <div style={{ marginTop: 14, fontSize: 12 }}>
          {(ads?.listings ?? []).length === 0
            ? <span style={dim}>{t('No listings yet.')}</span>
            : (ads?.listings ?? []).map(listing => {
              const rejected = listing.review == null || listing.review.verdict !== 'ok'
              const blocked = listing.blocked === true
              const unfunded = !rejected && !blocked && listing.campaign == null
              const spent = !rejected && !blocked && listing.campaign != null && listing.spent === true
              const label = blocked
                ? t('Blocked by the operator')
                : rejected
                  ? t('Not accepted')
                  : unfunded
                    ? t('Reviewed — fund it to go live')
                    : spent
                      ? t('Budget spent — ad stopped')
                      : t('Live')

              return (
                <div key={listing.id} style={{ ...row, alignItems: 'center', borderTop: '1px solid rgba(127,137,153,.18)' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {listing.title}
                    </span>
                    <span style={{ ...dim, fontSize: 11 }}>
                      {listing.paused === true ? `⏸ ${t('paused')} · ` : ''}
                      {usdcOf(listing.priceMicro)} USDC / {t('impression')}
                      {' · '}
                      {listing.campaign == null
                        ? t('not funded')
                        : `${t('left')} ${usdcOf(listing.remainingMicro)} USDC`}
                      {listing.impressions > 0 ? ` · ${listing.impressions} ${t('shown')}` : ''}
                      {listing.clicks > 0 ? ` · ${listing.clicks} ${t('clicks')}` : ''}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: spent || rejected || blocked ? '#ff8b9a' : undefined, opacity: spent || rejected || blocked ? 1 : 0.7 }}>
                      {label}
                      {rejected && listing.review?.reasons != null && listing.review.reasons.length > 0
                        ? ` — ${listing.review.reasons.join(' · ')}`
                        : ''}
                    </span>
                  </span>
                  <span style={{ display: 'inline-flex', gap: 6, flex: '0 0 auto' }}>
                    {unfunded && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={adBusy !== null}
                        onClick={() => { void fundListing(listing) }}
                      >
                        {adBusy === `fund:${listing.id}` ? t('Funding…') : t('Fund and publish')}
                      </Button>
                    )}
                    {listing.campaign != null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={adBusy !== null || listing.blocked === true}
                        onClick={() => { void pauseListing(listing) }}
                      >
                        {adBusy === `pause:${listing.id}`
                          ? '…'
                          : listing.paused === true ? t('Resume') : t('Pause')}
                      </Button>
                    )}
                    {listing.campaign != null && listing.paused === true && Number(listing.withdrawableMicro ?? '0') > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={adBusy !== null}
                        onClick={() => { void withdrawListing(listing) }}
                      >
                        {adBusy === `withdraw:${listing.id}` ? '…' : t('Withdraw unused')}
                      </Button>
                    )}
                  </span>
                </div>
              )
            })}
        </div>
        <div style={{ ...dim, fontSize: 11, marginTop: 8 }}>
          {t('Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.')}
        </div>
      </div>

    </div>
  )
}

export function apply(ctx: ClientContext): void {
  try { installLocale(ctx) } catch (error) { console.error('genkaku i18n:', error) }
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

  // 0.3: the sponsored placement is a Turn-tail entry, i.e. a card under the
  // closing prose of the newest answer — the seat ChatGPT uses for its ads.
  // It renders nothing while the ads service says "paused" (what a fresh
  // install sees), on any Turn but the latest, and before that Turn closes.
  ctx.effect(() => ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    id: 'genkaku-sponsored',
    order: 20,
  }, AdDock)), 'genkaku-user: sponsored card')
}
