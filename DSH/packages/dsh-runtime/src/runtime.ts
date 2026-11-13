// GENKAKU for dsh — Cordis plugin entry.
// User mode starts the OpenAI-compatible local bridge (dsh dials it as a plain
// model provider); worker modes start the libp2p sidecar that serves the local
// Ollama instance. The mode manager enforces the D-block (never consume and
// serve on one machine at the same time).

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { Context, Logger, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings'
import type { Libp2p } from 'libp2p'
import type { Hex } from 'viem'
import { generatePrivateKey } from 'viem/accounts'

import { startOpenAiBridge } from '@genkaku/protocol'
import {
  advertiseWorker,
  claimAccrual,
  deactivateWorker,
  hasPublicAddr,
  locatorOf,
  preferredAddr,
  publicClientFor,
  readAccrued,
  readWorker,
  readWalletBalances,
  readWorkerLocators,
  registerWorkerWithLocator,
  transportOf,
  walletAddress,
  walletClientFor,
} from '@genkaku/protocol'
import { fetchSeedPeers, fetchSeedRelays } from '@genkaku/protocol'
import { loadDirectory, syncDirectory, workerAddrs } from '@genkaku/protocol'
import { createKeyVault, mintTestUsdc, normalizeKey, type KeyVault, type WalletControl } from '@genkaku/protocol'
import { announceToSeed, connectRelay, createOllamaChatSource, createOllamaSource, probeModels } from '@genkaku/protocol'
import { createOllamaSupervisor, type OllamaSupervisor } from '@genkaku/protocol'
import { ModeManager, type RoleMode } from '@genkaku/protocol'
import { probeRpc } from '@genkaku/protocol'
import { HARDCODED_SEEDS, type NetEnvironment } from '@genkaku/protocol'
import { toWire, type Offer } from '@genkaku/protocol'
import { CreditTracker } from '@genkaku/protocol'
import { createPaywall } from '@genkaku/protocol'
import { readPublishOptIn, readSettleOptIn, writePublishOptIn, writeSettleOptIn } from '@genkaku/protocol'
import { createSidecar, createUserNode } from '@genkaku/protocol'
import type { GenkakuSidecar } from '@genkaku/protocol'
import { POLICY_VERSION, peerIdDigestOf, policyHashOf } from '@genkaku/protocol'
import { startStatusServer, type CatalogEntryInput, type StatusHandle, type StatusSnapshot } from '@genkaku/protocol'

/** Settings document this runtime reads; each adapter passes its own id so the
 *  worker and user plugins can be installed side by side. */
export const DEFAULT_SETTINGS_NS = 'genkaku'

/** One (model, price) row the worker publishes on the offer board. */
export type CatalogEntry = {
  /** Ollama model name, e.g. "llama3:8b" */
  model: string
  /** 6-decimal USDC per hour, as a decimal string */
  pricePerHour: string
  /** Ollama capability list; absent for rows written before probing existed. */
  capabilities?: string[]
  /** raw details.parameter_size from Ollama. */
  parameterSize?: string
  /** Marketplace tier derived from the two fields above. */
  tier?: 'agent' | 'light' | 'chat'
  /** coarse, self-reported city (privacy: never street-level) */
  city?: string
  /** 0–100 self-reported credit heuristic */
  creditScore?: number
  /** completed sessions (joins into creditScore on-chain later) */
  sessionsServed?: number
  /** parallel sessions the worker accepts */
  maxConcurrent?: number
}

export interface Config {
  /** user = consume remote workers; localPlusSharing / workerDedicated = serve */
  mode: Volatile<RoleMode>
  /** data-plane chain the receipts bind to */
  env: NetEnvironment
  /** local OpenAI bridge port (0 = ephemeral; user mode only) */
  port: Volatile<number>
  /** worker multiaddrs; empty = discover through the baked seed peers */
  workers: Volatile<string[]>
  /** open/settle real escrows (Base Sepolia only). Default ON: a worker's
   *  paywall is ON by default, so a free-session client would always be
   *  refused. Set false only for an offline/dev pair. */
  settle: boolean
  /** refuse to serve unless the client's escrow pays this worker (P4.9d).
   *  Defaults ON: a directory entry with the gate off is free GPU for anyone
   *  who scans the chain. Dev machines opt out explicitly. */
  paywall: boolean
  /** directory for the encrypted key vault (default ~/.dsh/genkaku) */
  keyDir: string
  /** worker-side offer rows */
  catalog: CatalogEntry[]
  /** worker-side libp2p listen addresses */
  listen: string[]
  /** publish this worker's public address to the on-chain directory. OFF by
   *  default: a global IP is permanent once written (privacy decision §25). */
  publishAddress: boolean
  /** worker name shown on the offer board */
  workerName: string
  /** start the local `ollama serve` before the worker sidecar starts */
  spawnOllama: boolean
  /** local Ollama base URL */
  ollamaHost: string
  /** Offer every local model at the default price when the catalog is empty. */
  autoCatalog: boolean
  /** 6-decimal USDC per hour for auto-listed models. */
  defaultPricePerHour: string
}

const catalogEntry = z.object({
  model: z.string().min(1).required(),
  pricePerHour: z.string().pattern(/^\d+$/).default('0'),
  city: z.string(),
  creditScore: z.natural().max(100).default(50),
  sessionsServed: z.natural().default(0),
  maxConcurrent: z.natural().min(1),
})

/** Validated plugin configuration. */
export const Config = z.object({
  mode: z.union(['user', 'localPlusSharing', 'workerDedicated']).default('user').volatile(),
  env: z.union(['base-sepolia', 'base']).default('base-sepolia'),
  port: z.natural().max(65535).default(47821).volatile(),
  workers: z.array(z.string().min(1)).default([]).volatile(),
  settle: z.boolean().default(true),
  paywall: z.boolean().default(true),
  keyDir: z.string().min(1).default(join(homedir(), '.dsh', 'genkaku')),
  catalog: z.array(catalogEntry).default([]),
  /**
   * When the catalog is empty, offer every model Ollama already has at
   * `defaultPricePerHour`. Without this a fresh worker starts with nothing on
   * the board, which reads as "the plugin does nothing".
   */
  autoCatalog: z.boolean().default(true),
  /**
   * 6-decimal USDC per hour used by autoCatalog entries. Defaults to 0: a
   * machine that has not priced its models is offering them for free, which
   * is recoverable. A default above zero would put a price on a stranger's
   * hardware that they never agreed to.
   */
  defaultPricePerHour: z.string().pattern(/^\d+$/).default('0'),
  // IPv4 and IPv6 need separate binds (a /ip6/::/ bind is v6-only), and a
  // global IPv6 address means a directly dialable worker with no NAT at all —
  // the cheapest way for a dorm/public-wifi peer to be reachable (P4.9j).
  listen: z.array(z.string().min(1)).default(['/ip4/0.0.0.0/tcp/4001', '/ip6/::/tcp/4002']),
  publishAddress: z.boolean().default(false),
  workerName: z.string().min(1).default('dsh-genkaku'),
  spawnOllama: z.boolean().default(true),
  ollamaHost: z.string().pattern(/^https?:\/\//).default('http://127.0.0.1:11434'),
})

/**
 * Start the side that this machine's role allows. The controller reads the
 * volatile mode once at startup; startup is awaited directly so a failure
 * rejects the plugin, and only a successful start registers teardown.
 */
/**
 * Build one DeepSeek Harness plugin from this runtime.
 *
 * The worker and user adapters are separate packages, but they share one
 * implementation: what differs is the plugin id, the settings namespace, and
 * the role it is allowed to run. Returns the exact shape dsh expects from a
 * plugin module (`name`, `inject`, `Config`, `apply`).
 *
 * @param options.pluginName - cordis plugin name, e.g. `genkaku-worker`.
 * @param options.settingsNs - settings document id this adapter owns.
 * @param options.role - serving or consuming; overrides any stored mode.
 */
export function defineGenkakuPlugin(options: {
  pluginName: string
  settingsNs: string
  role?: RoleMode
  /** Extra cordis services the adapter half needs (e.g. `llm`). */
  injectExtra?: readonly string[]
  /** Runs once the runtime is up; where an adapter registers its own services. */
  onStarted?: (ctx: Context, config: Config) => void
}) {
  const { pluginName, settingsNs, role, injectExtra = [], onStarted } = options

  async function apply(ctx: Context, config: Config): Promise<void> {
    ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })

    const log = ctx.logger(pluginName)
    const keyDir = config.keyDir
    // rpc.ts keeps its probe cache next to the rest of the GenKaKu state; the
    // module reads this once per call, so exporting the resolved dir is enough.
    process.env.GENKAKU_KEY_DIR = keyDir

    // dsh exposes no safeStorage/keyring codec, so createKeyVault falls back to a
    // plaintext pass-through. Say so at startup: signing keys stay unencrypted.
    log.warn(
      '%s key vault at %s is PLAINTEXT (no key codec available on this host); '
      + 'user/worker signing keys are stored unencrypted — restrict the directory permissions',
      pluginName,
      keyDir,
    )

    const vault = createKeyVault({ dir: keyDir })
    const modeManager = new ModeManager()
    const runtime = new GenkakuRuntime(ctx, config, vault, modeManager, log, keyDir, role, settingsNs)

    // Startup must never block the harness. Chain sync, Ollama discovery and
    // the paywall can each wait on a network or a missing binary; awaiting them
    // here kept the whole UI from booting. The panel reads live status, so a
    // failure is reported there instead of preventing the app from starting.
    void runtime.applyMode().catch((error) => {
      log.warn(
        '%s: startup failed (%s) — the panel still loads; fix settings and restart',
        pluginName,
        error instanceof Error ? error.message : String(error),
      )
    })

    // Live edits to the volatile startup fields restart the owning half on demand.
    ctx.effect(() => ctx.on('settings/document-updated', (ns) => {
      if (String(ns) === settingsNs) void runtime.reconfigure()
    }), `${pluginName}: settings updates`)

    // Startup is complete, so the disposer body stays synchronous: it returns
    // the async teardown for Cordis to await at unload.
    ctx.effect(() => () => runtime.dispose(), `${pluginName}: bridge and sidecar lifecycle`)

    onStarted?.(ctx, config)
  }

  return {
    name: pluginName,
    inject: ['settings', ...injectExtra] as readonly string[],
    Config,
    apply,
  }
}

/** Startup fields that require a restart when they change. */
type AppliedStartup = {
  modeClass: 'user' | 'worker'
  port: number
  workers: string
  /** Directory opt-in; a worker restart is the only way to apply it. */
  publish: boolean
  /** Escrow settlement; the bridge reads it once at construction. */
  settle: boolean
}

/** Owns the running halves so the mode starter and teardown share one state. */
export class GenkakuRuntime {
  private node: Libp2p | null = null
  private ollama: OllamaSupervisor | null = null
  private stop: (() => Promise<void>) | null = null
  private statusServer: StatusHandle | null = null
  private applied: AppliedStartup | null = null
  /** Worker-side address watcher: advertise only when the announced set moves. */
  private advertiseState: {
    worker: { peerAddrs: () => string[] }
    peerId: string
    wallet: `0x${string}`
    key: `0x${string}`
    env: NetEnvironment
    /** config.publishAddress captured at start */
    publish: boolean
    applied: string
    pending: string | null
    /** a retraction is in flight (lost public reachability) */
    retracting: boolean
  } | null = null
  private advertiseTimer: ReturnType<typeof setInterval> | null = null
  private announceTimer: ReturnType<typeof setInterval> | null = null
  private reconfigureQueue: Promise<void> = Promise.resolve()
  private modeTicker: ReturnType<typeof setInterval> | null = null
  private pendingMode: { mode: RoleMode; retries: number } | null = null
  private modeUpdating = false
  /** The first start, so a settings event during boot cannot restart it. */
  private booting: Promise<void> | null = null

  constructor(
    private readonly ctx: Context,
    private readonly config: Config,
    private readonly vault: KeyVault,
    private readonly modeManager: ModeManager,
    private readonly log: Logger,
    private readonly keyDir: string,
    /**
     * Mode this adapter is allowed to run. The worker plugin pins a serving
     * mode and the user plugin pins `user`, so installing both cannot make
     * them fight over the same peer identity and listen ports.
     */
    private readonly forcedMode?: RoleMode,
    /** Settings document id; defaults to the single-plugin namespace. */
    private readonly settingsNs: string = DEFAULT_SETTINGS_NS,
  ) {}

  /** Settlement as configured, with the panel's opt-in taking precedence. */
  private settleOn(): boolean {
    const optIn = readSettleOptIn(this.keyDir)

    return optIn ?? this.config.settle
  }

  /** Read the configured mode once, switch the guard, and start its half. */
  async applyMode(): Promise<void> {
    this.booting = (async () => {
      this.startModeTicker()
      const mode = this.forcedMode ?? this.config.mode.get()
      this.modeManager.switch(mode)
      if (mode === 'user') await this.startUser()
      else await this.startWorker()
      this.applied = this.startupState(mode)
    })()

    try {
      await this.booting
    } finally {
      this.booting = null
    }
  }

  /** Store the latest requested mode; the runtime ticker applies it. */
  private scheduleMode(mode: RoleMode): void {
    this.pendingMode = { mode, retries: 4 }
    modeLog('queued mode=' + mode)
  }

  /** Persistent 300 ms pump, created outside request contexts. */
  private startModeTicker(): void {
    if (this.modeTicker != null) return
    this.modeTicker = setInterval(() => { this.flushMode() }, 300)
    this.modeTicker.unref()
  }

  private stopModeTicker(): void {
    if (this.modeTicker != null) {
      clearInterval(this.modeTicker)
      this.modeTicker = null
    }
    this.pendingMode = null
  }

  /** Apply the latest pending mode, retrying only mid-reload failures. */
  private flushMode(): void {
    if (this.modeUpdating || this.pendingMode == null) return
    const pending = this.pendingMode
    this.pendingMode = null
    this.modeUpdating = true

    void this.ctx.settings.update(this.settingsNs, { mode: pending.mode }).then(() => {
      this.modeUpdating = false
      modeLog('applied mode=' + pending.mode)
    }).catch((error) => {
      this.modeUpdating = false
      const message = error instanceof Error ? error.message : String(error)
      if (/nested|hmr/i.test(message) && pending.retries > 0 && this.pendingMode == null) {
        this.pendingMode = { mode: pending.mode, retries: pending.retries - 1 }
        modeLog('retry ' + (5 - pending.retries) + ' after ' + message)
        return
      }
      modeLog('mode switch error ' + message)
      this.log.warn('mode switch failed (%s)', message)
    })
  }

  /** Serialize settings-driven restarts; each call waits for the previous one. */
  reconfigure(): Promise<void> {
    modeLog('request')
    const run = this.reconfigureQueue.then(() => this.reconfigureNow())
    this.reconfigureQueue = run.catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      modeLog('error ' + message)
      this.log.warn('reconfigure failed (%s)', message)
    })
    return this.reconfigureQueue
  }

  /** Bounce the active half even when no startup field changed.
   *
   *  Directory/seed discovery, the balance cache and the sidecar's worker key
   *  are all read at startup and are not part of `startupState`, so a wallet
   *  rotation or a manual network rescan would otherwise be a no-op. */
  restart(): Promise<void> {
    modeLog('force restart')
    const run = this.reconfigureQueue.then(async () => {
      if (this.booting != null) await this.booting.catch(() => {})
      const mode = this.forcedMode ?? this.config.mode.get()
      await this.stopServices()
      this.modeManager.switch(mode)
      if (mode === 'user') await this.startUser()
      else await this.startWorker()
      this.applied = this.startupState(mode)
      modeLog('forced restart done mode=' + mode)
    })
    this.reconfigureQueue = run.catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      modeLog('restart error ' + message)
      this.log.warn('restart failed (%s)', message)
    })
    return this.reconfigureQueue
  }

  /** Restart only when a startup field changed; otherwise keep serving. */
  private async reconfigureNow(): Promise<void> {
    // A settings event can arrive while the first start is still running. The
    // restart would stop the node startUser() had just created, leaving the
    // earlier bridge bound to a stopped node: a second /genkaku/status port
    // that answers instantly with no offers.
    if (this.booting != null) {
      await this.booting.catch(() => {})
    }

    const mode = this.forcedMode ?? this.config.mode.get()
    const next = this.startupState(mode)
    modeLog('attempt mode=' + mode + ' class=' + next.modeClass + ' port=' + next.port)

    const changed: string[] = []
    if (this.applied == null) {
      changed.push('initial')
    } else {
      if (this.applied.modeClass !== next.modeClass) changed.push('modeClass')
      if (this.applied.port !== next.port) changed.push('port')
      if (this.applied.workers !== next.workers) changed.push('workers')
      // The settings-page opt-in is read at startup, so a toggle must restart
      // the worker half — otherwise the switch reports a state nothing honors.
      if (this.applied.publish !== next.publish) changed.push('publish')
      if (this.applied.settle !== next.settle) changed.push('settle')
    }

    if (changed.length === 0) {
      modeLog('skip unchanged class=' + next.modeClass + ' port=' + next.port)
      return
    }

    modeLog('restart changed=' + changed.join(',') + ' to=' + next.modeClass + ':' + next.port)
    this.log.info('settings changed; restarting the %s half', next.modeClass)
    await this.stopServices()
    this.modeManager.switch(mode)
    if (mode === 'user') await this.startUser()
    else await this.startWorker()
    this.applied = next
    modeLog('restarted class=' + next.modeClass + ' port=' + next.port)
  }

  private startupState(mode: RoleMode): AppliedStartup {
    return {
      modeClass: mode === 'user' ? 'user' : 'worker',
      port: this.config.port.get(),
      workers: [...this.config.workers.get()].join('\u0000'),
      publish: this.config.publishAddress || readPublishOptIn(this.keyDir),
      settle: this.settleOn(),
    }
  }

  /** User half: a bare libp2p dial node plus the OpenAI-compatible bridge. */
  async startUser(): Promise<void> {
    const userNode = await createUserNode()
    this.node = userNode
    void probeRpc(this.config.env, this.log)
    const configuredWorkers = [...this.config.workers.get()]
    const env = this.config.env
    const publicC = publicClientFor(env)

    // Chain directory first (P4.9b): a cold client with an empty config needs
    // nothing but a public Base RPC. A read failure falls back to the cached
    // directory, then to the seed list only if one was explicitly configured.
    let discovered: string[] = []
    try {
      await syncDirectory(publicC, env, this.keyDir, this.log)
    } catch (error) {
      this.log.warn('directory: chain scan failed (%s) — using the cached directory',
        error instanceof Error ? error.message : String(error))
    }
    discovered = workerAddrs(loadDirectory(this.keyDir, env))

    // The seed is a second discovery surface, not a fallback for an empty
    // directory: a worker behind NAT that has not published an on-chain entry
    // yet (no gas) still announces itself there. Treating the seed as a
    // fallback meant a single directory entry — usually the local worker —
    // hid every seed-only worker from the marketplace.
    const seeded = HARDCODED_SEEDS.length > 0 ? await discoverWorkers(userNode, this.log) : []
    if (seeded.length > 0) this.log.info('discovery: %d worker(s) announced to the seed', seeded.length)

    const workers = [...new Set([...configuredWorkers, ...discovered, ...seeded])]

    if (workers.length === 0) {
      this.log.warn('no workers configured or discovered; /v1/models will stay empty')
    }

    // P4.9h: behavioural credit from escrow events. Boot refresh is
    // fire-and-forget — an empty index only means offers show their own claim
    // until the first scan lands.
    const credit = new CreditTracker(publicC, env)
    void credit.refresh().catch((error) => {
      this.log.warn('credit: initial scan failed (%s)',
        error instanceof Error ? error.message : String(error))
    })
    const creditTimer = setInterval(() => {
      void credit.refresh().catch(() => {})
    }, 60_000)

    // Funding facts for the user marketplace panel. The status page polls every
    // few seconds, so the two reads are cached briefly and a failure only omits
    // the balance instead of failing the whole status response.
    const userWallet = walletAddress(this.vault.userKey())
    let balanceCache: { at: number; eth: bigint; usdc: bigint } | null = null
    const balances = async (): Promise<{ eth: bigint; usdc: bigint } | null> => {
      if (balanceCache != null && Date.now() - balanceCache.at < 20_000) return balanceCache
      try {
        const value = await readWalletBalances(publicC, env, userWallet)
        balanceCache = { at: Date.now(), ...value }
        return balanceCache
      } catch (error) {
        this.log.warn('balances: read failed (%s)', error instanceof Error ? error.message : String(error))
        return null
      }
    }

    // Same port-collision rule as the worker half: the worker plugin's status
    // server may already hold the configured port when both are installed.
    let bridge: Awaited<ReturnType<typeof startOpenAiBridge>> | null = null
    let bridgeError: unknown = null
    const basePort = this.config.port.get()

    for (let offset = 0; offset < 6 && bridge == null; offset++) {
      try {
        bridge = await startOpenAiBridge({
          workers,
          port: basePort + offset,
          env: this.config.env,
          modeManager: this.modeManager,
          getNode: async () => userNode,
          userKey: () => this.vault.userKey(),
          settle: this.settleOn(),
          onMode: (mode) => { this.scheduleMode(mode) },
          onRefresh: () => {
            // Re-reading the chain directory and the seed only happens on
            // start; let the HTTP reply land before the bridge goes down.
            const timer = setTimeout(() => { void this.restart() }, 400)
            timer.unref?.()
          },
          onSettings: (patch) => {
            // settle is NOT a volatile config field: writing it into the
            // profile patch is rejected by dsh. Keep it in the key directory
            // (like the worker's publish opt-in) and restart explicitly.
            if (patch.settle !== undefined) writeSettleOptIn(this.keyDir, patch.settle)

            if (patch.workers !== undefined) {
              // workers IS volatile, so the settings document is the right home.
              void this.ctx.settings.update(this.settingsNs, { workers: patch.workers })
                .catch((error) => {
                  this.log.warn('settings: workers not saved (%s)',
                    error instanceof Error ? error.message : String(error))
                })
            }

            this.log.info('settings: %s changed; restarting the bridge', Object.keys(patch).join(', '))
            void this.reconfigure()
          },
          wallet: {
            address: () => this.vault.addresses().user,
            exportKey: () => this.vault.userKey(),
            importKey: (privateKey) => {
              this.vault.setUserKey(normalizeKey(privateKey))
              // Let the HTTP reply land before the bridge is torn down.
              const timer = setTimeout(() => { void this.reconfigure() }, 400)
              timer.unref?.()
            },
            rotate: () => {
              this.vault.setUserKey(generatePrivateKey())
              this.log.info('wallet: generated a new user key; the old address keeps its funds')
              const timer = setTimeout(() => { void this.reconfigure() }, 400)
              timer.unref?.()
            },
            ...(env === 'base-sepolia'
              ? {
                mint: (amount: bigint) => mintTestUsdc(
                  walletClientFor(env, this.vault.userKey()),
                  env,
                  this.vault.addresses().user,
                  amount,
                ),
              }
              : {}),
          },
          getRelays: async () => seedRelays(userNode, this.log),
          credit: (wallets) => {
            const out = new Map<string, { score: number; sessions: number }>()

            for (const wallet of wallets) {
              const snap = credit.snapshot(wallet)

              if (snap != null) {out.set(wallet.toLowerCase(), { score: snap.score, sessions: snap.sessions })}
            }

            return out
          },
          log: line => this.log.info('%s', line),
          status: async () => {
            const value = await balances()
            return {
              env,
              settle: this.settleOn(),
              manualWorkers: [...this.config.workers.get()],
              ...(value == null ? {} : { balances: { eth: value.eth.toString(), usdc: value.usdc.toString() } }),
            }
          },
        })
        if (offset > 0) this.log.warn('bridge port %d was busy; using %d', basePort, basePort + offset)
      } catch (error) {
        bridgeError = error
        if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') break
      }
    }

    if (bridge == null) throw bridgeError instanceof Error ? bridgeError : new Error(String(bridgeError))

    this.log.info('openai bridge listening at %s', bridge.url)
    this.stop = async () => {
      clearInterval(creditTimer)
      await bridge.close()
    }
  }

  /** Worker half: the libp2p sidecar, its status dashboard, and Ollama. */
  async startWorker(): Promise<void> {
    this.ollama = createOllamaSupervisor(this.config.ollamaHost, line => this.log.info('%s', line))
    if (this.config.spawnOllama) {
      const state = await this.ollama.ensureRunning()
      if (state.running) this.log.info('ollama %s ready at %s', state.version ?? '', state.host)
      else {
        this.log.warn(
          'ollama is %s — the worker can start, but it cannot serve until onboarding finishes',
          state.installed ? `installed but not running (${state.error ?? 'no response'})` : 'not installed',
        )
      }
    }

    const workerKey = this.vault.workerKey()
    const workerWallet = this.vault.addresses().worker
    let workerCatalog = loadCatalog(this.keyDir, this.config.catalog, this.log)

    // First run: an empty board looks broken to the person who just installed
    // the plugin. Advertise what Ollama already has, at a stated default price,
    // and let the panel adjust it afterwards.
    // Also re-probe rows written before capability probing existed: an entry
    // without a tier cannot be labelled in the marketplace, and silently
    // keeping it that way would leave every model looking agent-capable.
    const needsProbe = workerCatalog.length === 0 || workerCatalog.some(entry => entry.tier === undefined)
    if (needsProbe && this.config.autoCatalog) {
      try {
        const profiles = await probeModels(this.config.ollamaHost)
        const priced = new Map(workerCatalog.map(entry => [entry.model, entry.pricePerHour]))
        workerCatalog = profiles.map(profile => ({
          model: profile.model,
          // Keep a price the worker already set; only new rows take the default.
          pricePerHour: priced.get(profile.model) ?? this.config.defaultPricePerHour,
          capabilities: profile.capabilities,
          ...(profile.parameterSize === undefined ? {} : { parameterSize: profile.parameterSize }),
          tier: profile.tier,
        }))
        if (workerCatalog.length > 0) {
          persistCatalog(this.keyDir, workerCatalog, this.log)
          this.log.info(
            'catalog: empty — auto-listed %d local model(s) at %s per hour',
            workerCatalog.length,
            this.config.defaultPricePerHour,
          )
        } else {
          this.log.warn('catalog: empty and Ollama has no models; run `ollama pull` to serve one')
        }
      } catch (error) {
        this.log.warn('catalog: auto-list failed (%s) — set catalog in settings',
          error instanceof Error ? error.message : String(error))
      }
    }

    const paywall = this.config.paywall
      ? createPaywall({
        publicC: publicClientFor(this.config.env),
        env: this.config.env,
        worker: workerWallet,
        // Free rows are the default price: a 0-value escrow reverts, so the
        // gate honors the operator's own zero quote instead of refusing them.
        prices: (model) => {
          const row = workerCatalog.find(entry => entry.model === model)
          return row === undefined ? undefined : BigInt(row.pricePerHour)
        },
        log: this.log,
      })
      : undefined

    if (paywall == null) {
      this.log.warn('paywall DISABLED — anyone who can dial this worker gets free inference')
    }

    // Relay hops are read from the seed at boot: the seed's peer id changes on
    // restart, so a baked multiaddr would rot. Failure is fine — a worker with
    // a public address does not need a relay.
    const relays = await seedRelays(null, this.log)

    const sidecar = await createSidecar({
      paywall,
      modeManager: this.modeManager,
      source: createOllamaSource(this.config.ollamaHost),
      // Serves open/1 sessions: chat messages plus tool schemas.
      chatSource: createOllamaChatSource(this.config.ollamaHost),
      listen: this.config.listen,
      catalog: catalogOf(this.config.workerName, workerCatalog),
      workerKey,
      relayHints: relays,
      log: line => this.log.warn('%s', line),
      sessionEvents: (event) => {
        if (event.type === 'session-error') this.log.warn('%s', event.message)
        else if (event.type === 'session-end') this.log.info('session %s ended (%d tokens)', event.sessionId, event.tokens)
      },
    })

    const bootAddrs = sidecar.peerAddrs()
    // The settings page writes a per-machine opt-in; the deployment default
    // (config.publishAddress) still forces it on when a release says so.
    const publish = this.config.publishAddress || readPublishOptIn(this.keyDir)
    const canPublish = publish && hasPublicAddr(bootAddrs)

    let registeredAtBoot = false

    if (canPublish) {
      registeredAtBoot = await registerBinding(
        this.config.env,
        this.keyDir,
        workerWallet,
        workerKey,
        sidecar.peerIdStr(),
        locatorOf(bootAddrs),
        this.log,
      )
    } else if (!publish) {
      // §39: a LAN-only peer cannot be dialed from the internet, so publishing
      // it into the global directory only creates dead entries. It can still
      // serve peers on the same network, and settlement is unaffected.
      this.log.warn(
        'worker has no publishable address or publishing is off — staying out of the chain directory; only peers on this network can dial it directly',
      )
      void retireStaleEntry(this.config.env, workerWallet, workerKey, sidecar.peerIdStr(), this.log)
    } else {
      // Publishing is ON but the relay reservation has not landed yet (it
      // arrives seconds after boot). Retiring here would tombstone a wallet
      // that is about to become reachable, so wait for the address watch.
      this.log.info(
        'worker has no public address yet — waiting for a seed relay reservation before publishing',
      )
    }
    void probeRpc(this.config.env, this.log)

    // The user plugin's OpenAI bridge takes the same configured port, so a
    // machine running both plugins would collide. Take the next free port and
    // let the panels discover which one answers (they scan 47821–47826).
    //
    // Balance reads are two RPC round trips. The panel's status probe gives up
    // after 2.5 s and would call the worker unreachable if a request waited on
    // a slow public RPC, so the snapshot serves the last figure and refreshes
    // behind it (stale-while-revalidate), re-reading after twenty seconds.
    const publicC = publicClientFor(this.config.env)
    let balanceCache: {
      at: number
      wallet: `0x${string}`
      eth: bigint
      usdc: bigint
      /** settled but not claimed — earnings sitting inside JobEscrow */
      accrued: bigint
    } | null = null
    let refreshing = false
    const refreshBalances = async (): Promise<void> => {
      if (refreshing) return
      refreshing = true
      try {
        // `accrued` is the money settlements already credited to this worker.
        // It is NOT wallet USDC: it leaves JobEscrow only when the worker
        // claims it, which is why the panel shows both figures.
        const [value, accrued] = await Promise.all([
          readWalletBalances(publicC, this.config.env, workerWallet),
          readAccrued(publicC, this.config.env, workerWallet).catch(() => 0n),
        ])
        balanceCache = { at: Date.now(), wallet: workerWallet, ...value, accrued }
      } catch (error) {
        this.log.warn('balances: read failed (%s)', error instanceof Error ? error.message : String(error))
      } finally {
        refreshing = false
      }
    }
    const balances = (): typeof balanceCache => {
      if (balanceCache == null || balanceCache.wallet !== workerWallet || Date.now() - balanceCache.at > 20_000) {
        void refreshBalances()
      }
      return balanceCache
    }
    // Warm the cache while the sidecar is still booting, so the panel's first
    // poll already has a figure instead of showing "—".
    void refreshBalances()

    const snapshot = async (): Promise<StatusSnapshot> => {
      const liveAddrs = sidecar.peerAddrs()
      const best = preferredAddr(liveAddrs)
      const value = balances()

      return {
        role: this.modeManager.current().mode,
        peerId: sidecar.peerIdStr(),
        peerAddrs: liveAddrs,
        wallet: workerWallet,
        offers: catalogOf(this.config.workerName, workerCatalog).map(offer => ({
          addr: best,
          offer: { ...toWire(offer), workerWallet },
        })),
        activeSessions: sidecar.activeSessions(),
        reachable: hasPublicAddr(liveAddrs),
        publishAddress: publish,
        // A public address alone is not a listing: report the directory write
        // that actually succeeded, so the panel never claims a dead entry.
        published: publish
          && this.advertiseState != null
          && this.advertiseState.applied !== '',
        publishForced: this.config.publishAddress,
        transport: transportOf(liveAddrs),
        relayHints: relays,
        ...(value == null ? {} : {
          balances: {
            eth: value.eth.toString(),
            usdc: value.usdc.toString(),
            accrued: value.accrued.toString(),
          },
        }),
      }
    }

    const onCatalog = (catalog: CatalogEntryInput[]): void => {
      workerCatalog = entriesFromInput(catalog)
      sidecar.setCatalog(catalogOf(this.config.workerName, workerCatalog))
      persistCatalog(this.keyDir, workerCatalog, this.log)
      this.log.info('catalog: saved %d offer(s) to %s', workerCatalog.length, join(this.keyDir, 'catalog.json'))
    }

    const onMode = (mode: RoleMode): void => { this.scheduleMode(mode) }

    const onPublish = (next: boolean): void => {
      writePublishOptIn(this.keyDir, next)
      this.log.info('directory publishing %s; restarting the worker half', next ? 'enabled' : 'disabled')
      // The opt-in is only read by startWorker, and settings may not emit an
      // update when the pinned mode is unchanged: restart directly.
      void this.reconfigure()
    }

    // The worker identity is a wallet: its key signs receipts and binds the
    // chain directory entry. Import/rotate therefore has to deal with the entry
    // the OLD key owns — only that key can tombstone it, and it is about to be
    // dropped from the vault. The retraction is best effort and runs after the
    // reply: an unreachable RPC must never leave the panel unable to change its
    // own wallet.
    const replaceWorkerKey = (next: Hex, how: 'imported' | 'generated'): void => {
      const previousKey = this.vault.workerKey()
      const previousWallet = walletAddress(previousKey)
      const wasPublished = (this.advertiseState?.applied ?? '') !== ''
      this.vault.setWorkerKey(next)
      this.log.info(
        'wallet: worker key %s — address is now %s (previous %s)',
        how,
        walletAddress(next),
        previousWallet,
      )

      const timer = setTimeout(() => {
        void (async () => {
          if (wasPublished) {
            try {
              const tx = await deactivateWorker(walletClientFor(this.config.env, previousKey), this.config.env)
              registryLog('rotate-retire wallet=' + previousWallet + ' tx=' + tx)
              this.log.info('wallet: previous worker entry retired (tx %s)', tx)
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              registryLog('rotate-retire-error wallet=' + previousWallet + ' ' + message)
              this.log.warn('wallet: could not retire %s (%s) — the old listing may stay until it goes stale',
                previousWallet, message)
            }
          }
          // The sidecar was built with the old key and the wallet is not part
          // of startupState, so reconfigure() would short-circuit here.
          await this.restart()
        })()
      }, 400)
      timer.unref?.()
    }

    const onWallet: WalletControl = {
      address: () => this.vault.addresses().worker,
      exportKey: () => this.vault.workerKey(),
      importKey: (privateKey) => { replaceWorkerKey(normalizeKey(privateKey), 'imported') },
      rotate: () => { replaceWorkerKey(generatePrivateKey(), 'generated') },
      // No mint: a worker earns USDC and only needs ETH for gas, which a test
      // faucet hands out by address — there is nothing to mint from here.
      //
      // Settlements credit `accrued[worker]` inside JobEscrow; USDC reaches the
      // wallet only when the worker claims it, and the claim is a transaction
      // the worker wallet itself pays gas for.
      claim: async () => {
        const tx = await claimAccrual(walletClientFor(this.config.env, workerKey), this.config.env)
        await publicC.waitForTransactionReceipt({ hash: tx }).catch(() => {})
        balanceCache = null
        void refreshBalances()

        return tx
      },
    }

    const basePort = this.config.port.get()
    let opened: StatusHandle | null = null
    let lastError: unknown = null

    for (let offset = 0; offset < 6 && opened == null; offset++) {
      try {
        opened = await startStatusServer({
          port: basePort + offset,
          snapshot,
          onCatalog,
          onMode,
          ollama: this.ollama ?? undefined,
          onPublish,
          wallet: onWallet,
        })
        if (offset > 0) this.log.warn('status port %d was busy; dashboard moved to %d', basePort, basePort + offset)
      } catch (error) {
        lastError = error
        if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') break
      }
    }

    if (opened == null) throw lastError instanceof Error ? lastError : new Error(String(lastError))
    this.statusServer = opened

    // A listing from a previous run still exists on-chain even when this boot
    // has no public address yet; the watch needs to know it before it decides
    // whether to retract or overwrite.
    const known = loadDirectory(this.keyDir, this.config.env).entries
      .find(entry => entry.wallet.toLowerCase() === workerWallet.toLowerCase())

    this.advertiseState = {
      worker: sidecar,
      peerId: sidecar.peerIdStr(),
      wallet: workerWallet,
      key: workerKey,
      env: this.config.env,
      publish,
      applied: canPublish && registeredAtBoot ? locatorOf(bootAddrs) : (known?.locator ?? ''),
      pending: null,
      retracting: false,
    }
    this.startAdvertiseWatch()

    this.log.info('worker %s listening on %s', sidecar.peerIdStr(), sidecar.peerAddrs().join(', '))

    // Announce to the configured seeds so a cold client can find this worker
    // without already knowing its multiaddr. Re-announced periodically: the
    // relay reservation lands a few seconds after boot, so the first frame
    // cannot carry the /p2p-circuit address yet.
    this.startAnnounceWatch(sidecar)
    this.log.info('worker dashboard at %s', this.statusServer.url)
    this.stop = sidecar.stop
  }

  /** Re-announce on a slow tick so relay addresses (and a changed LAN address)
   *  reach the seed. The seed expires entries after ten minutes. */
  private startAnnounceWatch(sidecar: GenkakuSidecar): void {
    this.stopAnnounceWatch()

    const push = (): void => {
      const addrs = sidecar.peerAddrs()

      for (const seed of HARDCODED_SEEDS) {
        void announceToSeed(sidecar.node, seed, addrs)
          .then(async (ok) => {
            if (ok) {
              this.log.info('announced to seed %s', seed)

              return
            }

            // The seed's peer id changes when it restarts, which invalidates
            // both its cached relay hop and the announcement target. Re-read
            // the addresses and reserve again.
            const fresh = await seedRelays(sidecar.node, this.log, 0)

            for (const relay of fresh) connectRelay(sidecar.node, relay)
          })
          .catch((error) => {
            this.log.warn('announce to %s failed (%s)', seed,
              error instanceof Error ? error.message : String(error))
          })
      }
    }

    push()
    const timer = setInterval(push, 4 * 60_000)
    timer.unref?.()
    this.announceTimer = timer
  }

  private stopAnnounceWatch(): void {
    if (this.announceTimer != null) clearInterval(this.announceTimer)
    this.announceTimer = null
  }

  /** Poll the announce set; advertise only after it has been stable for two
   *  checks. A worker's listen addrs flap while interfaces come up (Wi-Fi,
   *  VPN, sleep/wake) and every advertise is a chain write — this turns a
   *  flap into zero transactions instead of a burst of them. */
  private startAdvertiseWatch(): void {
    this.stopAdvertiseWatch()
    const timer = setInterval(() => { void this.checkAdvertise() }, 30_000)
    timer.unref?.()
    this.advertiseTimer = timer
  }

  /** Stop the timer only. Clearing `advertiseState` here used to wipe the
   *  state that startAdvertiseWatch() had just been given, so the watcher never
   *  ran and a worker that gained a relay address was never published. */
  private stopAdvertiseWatch(): void {
    if (this.advertiseTimer != null) clearInterval(this.advertiseTimer)
    this.advertiseTimer = null
  }

  private async checkAdvertise(): Promise<void> {
    const state = this.advertiseState
    if (state == null) return

    let current = ''

    try {
      const addrs = state.worker.peerAddrs()

      // Either LAN-only (public wifi, CGNAT, UPnP off) or publishing is off:
      // nothing on-chain should point here. If it used to, retract once.
      if (!state.publish || !hasPublicAddr(addrs)) {
        state.pending = null

        if (state.applied !== '' && !state.retracting) {
          state.retracting = true

          try {
            const tx = await deactivateWorker(walletClientFor(state.env, state.key), state.env)
            registryLog('deactivate wallet=' + state.wallet + ' tx=' + tx)
            this.log.info('worker lost public reachability — removed from the chain directory (tx %s)', tx)
            state.applied = ''
          } catch (error) {
            this.log.warn('worker retract failed (%s)',
              error instanceof Error ? error.message : String(error))
          } finally {
            state.retracting = false
          }
        }

        return
      }

      current = locatorOf(addrs)
    } catch {
      return
    }

    if (current === '' || current === state.applied) {
      state.pending = null
      return
    }

    // first sighting: remember it; second identical sighting: write
    if (state.pending !== current) {
      state.pending = current
      return
    }

    try {
      // registerBinding covers all three cases: a wallet tombstoned by an
      // earlier retraction must be re-registered before advertise() is legal.
      const ok = await registerBinding(
        state.env,
        this.keyDir,
        state.wallet,
        state.key,
        state.peerId,
        current,
        this.log,
      )

      if (ok) {
        state.applied = current
        this.log.info('worker locator updated on-chain')
      }
      state.pending = null
    } catch (error) {
      state.pending = null
      this.log.warn('worker advertise failed (%s)',
        error instanceof Error ? error.message : String(error))
    }
  }

  /** Stop the running halves without touching the lifetime mode ticker. */
  private async stopServices(): Promise<void> {
    this.stopAdvertiseWatch()
    this.advertiseState = null
    this.stopAnnounceWatch()
    await Promise.resolve(this.statusServer?.close()).catch(() => {})
    await Promise.resolve(this.stop?.()).catch(() => {})
    await Promise.resolve(this.node?.stop()).catch(() => {})
    this.ollama?.dispose()
    this.ollama = null
  }

  /** Shut down: stop services and the one lifetime mode ticker. */
  async stopAll(): Promise<void> {
    this.stopModeTicker()
    await this.stopServices()
  }

  /** Plugin-lifecycle shutdown alias. */
  async dispose(): Promise<void> {
    await this.stopAll()
  }
}

/** Relay hops the seed advertises, cached briefly: every session wants them,
 *  but the seed's peer id only changes when the process restarts. An explicit
 *  `GENKAKU_RELAY_HINTS` (comma-separated multiaddrs) overrides discovery. */
let relayCache: { at: number; relays: string[] } | null = null

async function seedRelays(node: Libp2p | null, log: Logger, maxAgeMs = 5 * 60_000): Promise<string[]> {
  const fromEnv = (process.env.GENKAKU_RELAY_HINTS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('/'))

  if (fromEnv.length > 0) return fromEnv
  if (relayCache != null && Date.now() - relayCache.at < maxAgeMs) return relayCache.relays

  const relays = new Set<string>()

  await Promise.all(HARDCODED_SEEDS.map(async (seed) => {
    try {
      for (const relay of await fetchSeedRelays(node, seed)) relays.add(relay)
    } catch (error) {
      log.warn('seed %s relay lookup failed (%s)', seed,
        error instanceof Error ? error.message : String(error))
    }
  }))

  const value = [...relays]

  // Only cache a success: a boot-time network hiccup would otherwise pin an
  // empty list for five minutes and hide the relay path entirely.
  if (value.length > 0) relayCache = { at: Date.now(), relays: value }

  return value
}

/** Seed peers are matchmakers: their peer list is the fallback worker set. */
async function discoverWorkers(node: Libp2p, log: Logger): Promise<string[]> {
  const peers = new Set<string>()

  await Promise.all(HARDCODED_SEEDS.map(async (seed) => {
    try {
      for (const peer of await fetchSeedPeers(node, seed)) peers.add(peer)
    } catch (error) {
      log.warn('seed %s unreachable (%s)', seed, error instanceof Error ? error.message : String(error))
    }
  }))

  return [...peers]
}

const REGISTRY_LOG = '/tmp/genkaku-registry.log'

/** Best-effort registry diagnostics; a log failure never affects registration. */
function registryLog(line: string): void {
  try {
    appendFileSync(REGISTRY_LOG, new Date().toISOString() + ' ' + line + String.fromCharCode(10))
  } catch {
    // best effort
  }
}

const MODE_LOG = '/tmp/genkaku-mode.log'

/** Best-effort mode-switch diagnostics; a log failure never affects reconfigure. */
function modeLog(line: string): void {
  try {
    appendFileSync(MODE_LOG, new Date().toISOString() + ' ' + line + String.fromCharCode(10))
  } catch {
    // best effort
  }
}

/** Best-effort WorkerRegistry pin: read/register failures only log, never stop serving. */
const workerDigest = (peerId: string): `0x${string}` => peerIdDigestOf(peerId)

/** Boot-time cleanup: a worker that is now LAN-only may still own a directory
 *  entry from a previous network. Retract it — but only when the on-chain
 *  binding is OURS, never someone else's. */
async function retireStaleEntry(
  env: NetEnvironment,
  wallet: `0x${string}`,
  workerKey: Hex,
  peerId: string,
  log: Logger,
): Promise<void> {
  try {
    const record = await readWorker(publicClientFor(env), env, wallet)

    if (record == null || !record.active) return
    if (record.peerId !== workerDigest(peerId)) return

    const tx = await deactivateWorker(walletClientFor(env, workerKey), env)
    registryLog('retire wallet=' + wallet + ' tx=' + tx)
    log.info('worker is LAN-only — stale directory entry retired (tx %s)', tx)
  } catch (error) {
    registryLog('retire-error wallet=' + wallet + ' ' + (error instanceof Error ? error.message : String(error)))
  }
}

async function registerBinding(
  env: NetEnvironment,
  keyDir: string,
  wallet: `0x${string}`,
  workerKey: Hex,
  peerId: string,
  locator: string,
  log: Logger,
): Promise<boolean> {
  registryLog('start wallet=' + wallet + ' peer=' + peerId + ' locator=' + locator)

  try {
    const peerIdDigest = peerIdDigestOf(peerId)
    const publicC = publicClientFor(env)
    const existing = await readWorker(publicC, env, wallet)
    registryLog('record wallet=' + wallet + ' peer=' + (existing == null ? 'none' : existing.peerId))

    // active=false means a previous selfDeactivate tombstoned this wallet;
    // advertise() would revert (NotRegistered), so re-register instead.
    if (existing != null && existing.peerId === peerIdDigest && existing.active) {
      // Binding is already right; only the address may have moved. The local
      // directory cache answers this for free in the common case; the chain is
      // only consulted when the cache has never seen this wallet.
      const cached = loadDirectory(keyDir, env).entries
        .find(entry => entry.wallet.toLowerCase() === wallet.toLowerCase())
      const onChain = cached != null
        ? []
        : await readWorkerLocators(publicC, env, { wallet })
      const advertised = cached?.locator ?? onChain[0]?.locator

      if (locator === '' || advertised === locator) {
        registryLog('skip wallet=' + wallet + ' already pins ' + peerId)
        log.info('worker registry already pins %s', peerId)
        return true
      }

      const tx = await advertiseWorker(walletClientFor(env, workerKey), env, locator)
      registryLog('advertise wallet=' + wallet + ' tx=' + tx)
      log.info('worker locator published for %s (tx %s)', peerId, tx)
      return true
    }

    registryLog('register wallet=' + wallet + ' ' + (existing == null ? 'new' : 'rebind ' + existing.peerId))

    const tx = await registerWorkerWithLocator(walletClientFor(env, workerKey), env, {
      peerIdDigest,
      policyHash: policyHashOf(POLICY_VERSION),
      locator,
    })
    registryLog('tx wallet=' + wallet + ' hash=' + tx)
    log.info('worker registry bound %s to %s (tx %s)', peerId, wallet, tx)

    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    registryLog('error wallet=' + wallet + ' ' + message)
    log.warn('worker registry registration failed (%s)', message)

    return false
  }
}

/** Persisted catalog location inside the key directory. */
function catalogPath(keyDir: string): string {
  return join(keyDir, 'catalog.json')
}

/** Read <keyDir>/catalog.json; a missing or invalid file falls back to config.catalog. */
function loadCatalog(keyDir: string, fallback: CatalogEntry[], log: Logger): CatalogEntry[] {
  const file = catalogPath(keyDir)
  try {
    const entries = normalizeCatalog(JSON.parse(readFileSync(file, 'utf8')) as unknown)
    if (entries != null) return entries
    log.warn('catalog: %s is not a valid catalog — using config.catalog', file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('catalog: cannot read %s (%s) — using config.catalog', file,
        error instanceof Error ? error.message : String(error))
    }
  }

  return fallback
}

/** Accept the persisted array or a POST-shaped {catalog: [...]} object. */
function normalizeCatalog(raw: unknown): CatalogEntry[] | null {
  const rows = Array.isArray(raw) ? raw : (raw as { catalog?: unknown } | null)?.catalog
  if (!Array.isArray(rows)) return null
  const entries: CatalogEntry[] = []
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) return null
    const model = (row as { model?: unknown }).model
    if (typeof model !== 'string' || model.trim() === '') return null
    const rawPrice = (row as { pricePerHour?: unknown }).pricePerHour
    const price = typeof rawPrice === 'number'
      ? String(Math.round(rawPrice))
      : typeof rawPrice === 'string' && /^\d+$/.test(rawPrice.trim()) ? rawPrice.trim() : null
    if (price == null) return null
    const entry: CatalogEntry = { model: model.trim(), pricePerHour: price }
    const city = (row as { city?: unknown }).city
    if (typeof city === 'string') entry.city = city
    const creditScore = (row as { creditScore?: unknown }).creditScore
    if (typeof creditScore === 'number') entry.creditScore = creditScore
    const sessionsServed = (row as { sessionsServed?: unknown }).sessionsServed
    if (typeof sessionsServed === 'number') entry.sessionsServed = sessionsServed
    const maxConcurrent = (row as { maxConcurrent?: unknown }).maxConcurrent
    if (typeof maxConcurrent === 'number') entry.maxConcurrent = maxConcurrent
    carryProbeFacts(row as Record<string, unknown>, entry)
    entries.push(entry)
  }

  return entries
}

/** POST /genkaku/catalog input (micro-USDC numbers) → persisted entries. */
function entriesFromInput(catalog: CatalogEntryInput[]): CatalogEntry[] {
  return catalog.map((row) => {
    const entry: CatalogEntry = { model: row.model, pricePerHour: String(Math.round(row.pricePerHour)) }
    if (typeof row.city === 'string') entry.city = row.city
    if (typeof row.creditScore === 'number') entry.creditScore = row.creditScore
    if (typeof row.sessionsServed === 'number') entry.sessionsServed = row.sessionsServed
    if (typeof row.maxConcurrent === 'number') entry.maxConcurrent = row.maxConcurrent
    carryProbeFacts(row as unknown as Record<string, unknown>, entry)
    return entry
  })
}

/**
 * Copy the probe results a caller echoed back onto an edited row.
 *
 * Offers carry their tier on the wire, so a price edit that dropped these
 * fields would demote every row from offers/1 to offers/0 — the marketplace
 * would lose the ability to label the models it just listed.
 */
function carryProbeFacts(row: Record<string, unknown>, entry: CatalogEntry): void {
  const capabilities = row.capabilities
  if (Array.isArray(capabilities) && capabilities.every(item => typeof item === 'string')) {
    entry.capabilities = capabilities
  }
  if (typeof row.parameterSize === 'string') entry.parameterSize = row.parameterSize
  if (row.tier === 'agent' || row.tier === 'light' || row.tier === 'chat') entry.tier = row.tier
}

/** Best-effort catalog persistence; a write failure only logs. */
function persistCatalog(keyDir: string, entries: CatalogEntry[], log: Logger): void {
  try {
    mkdirSync(keyDir, { recursive: true })
    writeFileSync(catalogPath(keyDir), JSON.stringify(entries, null, 2) + '\n')
  } catch (error) {
    log.warn('catalog: persist failed (%s)', error instanceof Error ? error.message : String(error))
  }
}

/** Catalog rows → the Offer shape createSidecar publishes (wallet added there). */
function catalogOf(workerName: string, entries: CatalogEntry[]): Offer[] {
  return entries.map(entry => {
    // A row that knows its capabilities publishes offers/1, so a client can
    // label it. Rows written before probing existed stay offers/0 rather than
    // claiming a tier they never measured.
    const probed = entry.capabilities !== undefined || entry.tier !== undefined
    return {
      proto: probed ? 'offers/1' as const : 'offers/0' as const,
      workerName,
      model: entry.model,
      pricePerHour: BigInt(entry.pricePerHour),
      city: entry.city,
      creditScore: entry.creditScore ?? 50,
      sessionsServed: entry.sessionsServed ?? 0,
      maxConcurrent: entry.maxConcurrent,
      ...(entry.capabilities === undefined ? {} : { capabilities: entry.capabilities }),
      ...(entry.parameterSize === undefined ? {} : { parameterSize: entry.parameterSize }),
      ...(entry.tier === undefined ? {} : { tier: entry.tier }),
    }
  })
}

/** Best-effort local Ollama service; a failed spawn leaves an existing daemon alone. */
