/**
 * DeepSeek Harness adapter for the GenKaKu protocol.
 *
 * One runtime, two plugin identities: `@genkaku/dsh-worker-plugin` pins a
 * serving role and `@genkaku/dsh-user-plugin` pins the consuming role. Keeping
 * the implementation here means the two packages cannot drift apart.
 */
export { Config, DEFAULT_SETTINGS_NS, GenkakuRuntime, defineGenkakuPlugin } from './runtime.ts'
export type { Config as GenkakuConfig } from './runtime.ts'
