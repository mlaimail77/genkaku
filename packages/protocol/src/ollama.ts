// GENKAKU: local Ollama lifecycle for worker onboarding (P4.7b).
//
// The desktop ships no multi-GB runtime. A worker either already runs Ollama
// or is guided to install it; this module only detects, starts and talks to
// the local HTTP API. Model management lives in llmBridge.ollamaAdmin.

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

import { ollamaAdmin, type ModelInfo, type PullProgress } from './llmBridge.ts'

/** Facts the settings page renders before it offers a next step. */
export type OllamaState = {
  /** an `ollama` executable was found on this machine */
  installed: boolean
  /** the local HTTP API answers right now */
  running: boolean
  /** version reported by `GET /api/version`, when running */
  version?: string
  /** base URL the plugin uses */
  host: string
  /** official installer page for this platform */
  downloadUrl: string
  /** installed models, empty when the service is not running */
  models: ModelInfo[]
  /** last detection or start failure, for the onboarding hint */
  error?: string
}

/** Official installer page per platform. */
export function ollamaDownloadUrl(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return 'https://ollama.com/download/mac'
  if (platform === 'win32') return 'https://ollama.com/download/windows'
  return 'https://ollama.com/download/linux'
}

/**
 * Locate an `ollama` executable without trusting the GUI process PATH.
 *
 * A packaged macOS app inherits a minimal PATH, so the Homebrew and app-bundle
 * locations are probed directly; on Windows the per-user installer path is the
 * usual one.
 * @param platform - target platform, injectable for tests.
 * @param environment - environment to read PATH from.
 * @returns absolute executable path, or undefined when Ollama is absent.
 */
export function locateOllama(
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const executable = platform === 'win32' ? 'ollama.exe' : 'ollama'
  // Scan PATH directly: a packaged GUI app cannot rely on `which`/`where`
  // because the inherited PATH is minimal and those tools may be unresolvable.
  for (const dir of (environment.PATH ?? '').split(delimiter)) {
    if (dir === '') continue
    const candidate = join(dir, executable)
    if (existsSync(candidate)) return candidate
  }
  const candidates = platform === 'darwin'
    ? [
      '/usr/local/bin/ollama',
      '/opt/homebrew/bin/ollama',
      '/Applications/Ollama.app/Contents/Resources/ollama',
      join(homedir(), 'Applications/Ollama.app/Contents/Resources/ollama'),
    ]
    : platform === 'win32'
      ? [
        join(environment.LOCALAPPDATA ?? join(homedir(), 'AppData/Local'), 'Programs/Ollama/ollama.exe'),
        join(environment.ProgramFiles ?? 'C:/Program Files', 'Ollama/ollama.exe'),
      ]
      : ['/usr/local/bin/ollama', '/usr/bin/ollama', '/snap/bin/ollama']
  return candidates.find(candidate => existsSync(candidate))
}

/** Read one JSON document from the local API with a bounded wait. */
async function getJson(url: string, timeoutMs = 1500): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`${url} refused (${response.status})`)
  return await response.json()
}

export type OllamaSupervisor = {
  /** Detect the binary, probe the service and list models. */
  state: () => Promise<OllamaState>
  /** Start `ollama serve` when installed but stopped; idempotent. */
  ensureRunning: () => Promise<OllamaState>
  /** Download a registry model, forwarding progress frames. */
  pull: (model: string, onProgress?: (p: PullProgress) => void, signal?: AbortSignal) => Promise<{ status: string }>
  /** Remove a locally installed model. */
  remove: (model: string) => Promise<void>
  /** Stop the child this supervisor started, if any. */
  dispose: () => void
}

/**
 * Build the worker-side Ollama supervisor.
 * @param host - local Ollama base URL.
 * @param log - diagnostic line sink.
 * @returns supervisor over the local install.
 */
export function createOllamaSupervisor(host: string, log: (line: string) => void): OllamaSupervisor {
  const admin = ollamaAdmin(host)
  const base = host.replace(/\/$/u, '')
  let child: ChildProcess | undefined
  let starting: Promise<OllamaState> | undefined

  const running = async (): Promise<{ running: boolean; version?: string; models: ModelInfo[]; error?: string }> => {
    try {
      const versionDoc = await getJson(`${base}/api/version`) as { version?: unknown }
      const models = await admin.list()
      return {
        running: true,
        ...(typeof versionDoc.version === 'string' ? { version: versionDoc.version } : {}),
        models,
      }
    } catch (error) {
      return { running: false, models: [], error: error instanceof Error ? error.message : String(error) }
    }
  }

  const state = async (): Promise<OllamaState> => {
    const probe = await running()
    const binary = locateOllama()
    if (probe.running) {
      return {
        installed: true,
        running: true,
        ...(probe.version === undefined ? {} : { version: probe.version }),
        host, downloadUrl: ollamaDownloadUrl(), models: probe.models,
      }
    }
    return {
      installed: binary !== undefined,
      running: false,
      host,
      downloadUrl: ollamaDownloadUrl(),
      models: [],
      ...(binary === undefined
        ? { error: 'ollama executable not found' }
        : probe.error === undefined ? {} : { error: probe.error }),
    }
  }

  const start = async (): Promise<OllamaState> => {
    const binary = locateOllama()
    if (binary === undefined) return await state()
    const url = new URL(base)
    log(`ollama: starting ${binary} serve (OLLAMA_HOST=${url.host})`)
    const spawned = spawn(binary, ['serve'], {
      env: { ...process.env, OLLAMA_HOST: url.host },
      stdio: 'ignore',
      detached: false,
      // Windows: do not flash a console window when the panel starts Ollama.
      windowsHide: true,
    })
    child = spawned
    spawned.once('error', (error) => { log(`ollama spawn failed (${error.message})`) })
    spawned.once('exit', (code, signal) => {
      if (child === spawned) child = undefined
      log(`ollama exited (${code ?? signal ?? 'unknown'})`)
    })
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const probe = await running()
      if (probe.running) return await state()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    const current = await state()
    return { ...current, error: current.error ?? 'ollama did not answer after 10s' }
  }

  return {
    state,
    ensureRunning: async () => {
      const current = await state()
      if (current.running || !current.installed) return current
      starting ??= start().finally(() => { starting = undefined })
      return await starting
    },
    pull: async (model, onProgress, signal) => await admin.pull(model, onProgress, signal),
    remove: async (model) => {
      const response = await fetch(`${base}/api/delete`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
      })
      if (!response.ok) throw new Error(`ollama delete refused (${response.status})`)
    },
    dispose: () => {
      if (child !== undefined && !child.killed) child.kill()
      child = undefined
    },
  }
}
