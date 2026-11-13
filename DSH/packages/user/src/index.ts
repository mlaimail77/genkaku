/**
 * GenKaKu user plugin — buy inference from the network.
 *
 * Pinned to the consuming role. It opens escrow sessions, streams tokens back
 * over libp2p, and settles per started minute.
 *
 * The other half of this package is the harness integration: a GenKaKu model
 * provider whose route is the plugin's own local bridge. Registering it here
 * rather than asking the user to hand-write a pi-ai route is what makes the
 * network appear in the normal model selector, with a warning badge on models
 * that cannot drive an agent loop.
 */

import { defineGenkakuPlugin } from '@genkaku/dsh-runtime'
import { GenkakuAdapter } from './adapter.ts'

/** Provider route key; also the prefix users see in model lists. */
export const PROVIDER = 'genkaku'

export const { name, inject, Config, apply } = defineGenkakuPlugin({
  pluginName: 'genkaku-user',
  settingsNs: 'genkaku-user',
  role: 'user',
  injectExtra: ['llm'],
  onStarted: (ctx, config) => {
    const log = ctx.logger('genkaku-user')
    // `config.port` is only the configured port. With the worker plugin
    // installed, the worker's status server can hold it and the bridge binds
    // the next free one, so the adapter resolves the live bridge itself.
    const adapter = new GenkakuAdapter({
      port: () => config.port.get(),
      log: line => log.info(line),
    })

    // Installing the worker plugin next to this one makes the harness reload
    // plugins; a second register for the same provider throws and took the
    // whole web boot down. Reuse the adapter that is already there instead.
    const guard = (label: string, register: () => unknown): (() => void) => {
      try {
        const dispose = register()
        return typeof dispose === 'function' ? dispose as () => void : () => {}
      } catch (error) {
        log.warn('%s: already registered (%s) — reusing the existing one', label,
          error instanceof Error ? error.message : String(error))
        return () => {}
      }
    }

    ctx.effect(
      () => guard('llm adapter', () => ctx.llm.registerAdapter([PROVIDER], adapter)),
      'genkaku-user: llm adapter',
    )
    ctx.effect(
      () => guard('provider route', () => ctx.llm.registerConfigurableProviders([{
        provider: PROVIDER,
        displayName: 'GenKaKu Network',
        settingsNs: 'genkaku-user',
        settingsPath: [],
      }])),
      'genkaku-user: provider route',
    )
  },
})
