// GENKAKU admin state: one small JSON file next to the seed state. It holds a
// scrypt password hash, the price the operator charges for relay traffic, and
// the byte baseline the current usage window started from. No keys, no money.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** What the operator says the seed VM costs, so the console can price usage. */
export type Pricing = {
  /** fixed monthly VM bill in USDC */
  vmMonthlyUsdc: string
  /** USDC per GB the seed reads from workers/clients */
  usdcPerGbIn: string
  /** USDC per GB the seed writes back */
  usdcPerGbOut: string
  /** included traffic before per-GB pricing applies */
  freeGbPerMonth: string
}

export type ProcessIo = { rchar: number; wchar: number }

export type AdminState = {
  version: 1
  password: { salt: string; hash: string }
  /** true until the operator replaces the initial password */
  mustChangePassword: boolean
  /** Set once, on a fresh install whose password was generated: the console
   *  prints it at boot and then forgets it (only the scrypt hash is kept). */
  generatedPassword?: string | null
  pricing: Pricing
  /** process counters when the current usage window began */
  baseline: { at: number; rchar: number; wchar: number } | null
  updatedAt: number
}

export const DEFAULT_PRICING: Pricing = {
  vmMonthlyUsdc: '24',
  usdcPerGbIn: '0.05',
  usdcPerGbOut: '0.15',
  freeGbPerMonth: '10',
}

function hashOf(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}

/** The password a brand-new install starts with.
 *
 *  There is deliberately no baked default: this file is public source, and a
 *  console reachable from the internet with a known password is a console with
 *  no password (it would also let the first visitor set their own and lock the
 *  operator out). An operator who wants to choose it sets
 *  GENKAKU_ADMIN_PASSWORD; otherwise one is generated and printed once at boot,
 *  where `journalctl -u genkaku-admin` can show it to whoever already has root
 *  on the host. Either way the console forces a change on first sign-in. */
function initialPassword(): { password: string; generated: boolean } {
  const configured = (process.env.GENKAKU_ADMIN_PASSWORD ?? '').trim()
  if (configured !== '') return { password: configured, generated: false }

  return { password: randomBytes(18).toString('base64url'), generated: true }
}

function freshState(): AdminState {
  const salt = randomBytes(16).toString('hex')
  const initial = initialPassword()

  return {
    version: 1,
    password: { salt, hash: hashOf(initial.password, salt) },
    mustChangePassword: true,
    generatedPassword: initial.generated ? initial.password : null,
    pricing: { ...DEFAULT_PRICING },
    baseline: null,
    updatedAt: Date.now(),
  }
}

/** Decimal string that must be >= 0; rejects NaN so a typo cannot zero a bill. */
function money(value: unknown, fallback: string): string {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  if (text === '') return fallback
  const n = Number(text)
  if (!Number.isFinite(n) || n < 0) throw new Error('price must be a non-negative number')

  return text
}

export class AdminStore {
  private state: AdminState

  constructor(private readonly file: string) {
    this.state = this.load()

    // Persist on first boot so the generated password hash survives a restart.
    if (!existsSync(file)) this.save()
  }

  private load(): AdminState {
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<AdminState>
      if (typeof parsed.password?.salt === 'string' && typeof parsed.password.hash === 'string') {
        return {
          version: 1,
          password: parsed.password,
          mustChangePassword: parsed.mustChangePassword !== false,
          generatedPassword: parsed.generatedPassword ?? null,
          pricing: { ...DEFAULT_PRICING, ...(parsed.pricing ?? {}) },
          baseline: parsed.baseline ?? null,
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        }
      }
    } catch {
      // fall through to a fresh state
    }

    return freshState()
  }

  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 })
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, `${JSON.stringify(this.state, undefined, 2)}\n`, { mode: 0o600 })
    renameSync(tmp, this.file)
  }

  get mustChangePassword(): boolean {
    return this.state.mustChangePassword
  }

  /** The generated first-boot password, returned exactly once and then erased
   *  from the state file — only the scrypt hash is kept after that. */
  takeGeneratedPassword(): string | null {
    const value = this.state.generatedPassword ?? null
    if (value != null) {
      this.state.generatedPassword = null
      this.save()
    }

    return value
  }

  get pricing(): Pricing {
    return { ...this.state.pricing }
  }

  get baseline(): AdminState['baseline'] {
    return this.state.baseline
  }

  /** Constant-time password check. */
  verify(password: string): boolean {
    const expected = Buffer.from(this.state.password.hash, 'hex')
    const actual = Buffer.from(hashOf(password, this.state.password.salt), 'hex')
    if (expected.length !== actual.length) return false

    return timingSafeEqual(expected, actual)
  }

  /** Replace the password; the operator-visible default disappears for good. */
  setPassword(next: string): void {
    if (next.length < 8) throw new Error('password must be at least 8 characters')
    const salt = randomBytes(16).toString('hex')
    this.state.password = { salt, hash: hashOf(next, salt) }
    this.state.mustChangePassword = false
    this.state.updatedAt = Date.now()
    this.save()
  }

  /** Patch the traffic/VM pricing; omitted fields keep their current value. */
  setPricing(patch: Partial<Record<keyof Pricing, unknown>>): Pricing {
    const current = this.state.pricing
    this.state.pricing = {
      vmMonthlyUsdc: money(patch.vmMonthlyUsdc, current.vmMonthlyUsdc),
      usdcPerGbIn: money(patch.usdcPerGbIn, current.usdcPerGbIn),
      usdcPerGbOut: money(patch.usdcPerGbOut, current.usdcPerGbOut),
      freeGbPerMonth: money(patch.freeGbPerMonth, current.freeGbPerMonth),
    }
    this.state.updatedAt = Date.now()
    this.save()

    return { ...this.state.pricing }
  }

  /** Start a new usage window at the current counter values. */
  setBaseline(io: ProcessIo | null): void {
    if (io == null) {
      this.state.baseline = null
    } else {
      this.state.baseline = { at: Date.now(), rchar: io.rchar, wchar: io.wchar }
    }
    this.state.updatedAt = Date.now()
    this.save()
  }
}
