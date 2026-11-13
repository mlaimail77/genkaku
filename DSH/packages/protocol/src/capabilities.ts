/**
 * What a shared model can actually do.
 *
 * Ollama reports a `capabilities` list per model (`completion`, `tools`,
 * `thinking`, `vision`, …). A model that lists `tools` accepts the field, which
 * is not the same as calling tools well: a 3B model usually emits malformed
 * calls. So the tier combines the capability with the parameter count, and the
 * UI labels only the bottom tier. Nothing here blocks a model from being
 * offered — the marketplace marks it instead.
 */

export type ModelTier = 'agent' | 'light' | 'chat'

export type ModelProfile = {
  model: string
  /** raw capability list from Ollama, e.g. ['completion', 'tools'] */
  capabilities: string[]
  /** raw `details.parameter_size`, e.g. '9.0B' */
  parameterSize?: string
  /** billions of parameters, parsed from `parameterSize` when possible */
  parametersB?: number
  tier: ModelTier
}

/** Size a model needs before its tool calls are worth advertising to an agent. */
export const AGENT_MIN_BILLIONS = 9
/** Below this a model with the `tools` capability is only a light agent. */
export const LIGHT_MIN_BILLIONS = 3

/**
 * Parse Ollama's `details.parameter_size` ('1.2B', '9b', '70B', '135M').
 * @param size - the raw string from `/api/tags`.
 * @returns billions of parameters, or undefined when the string is not a size.
 */
export function parseParameterSize(size: string | undefined): number | undefined {
  if (size == null) return undefined
  const match = /^\s*([\d.]+)\s*([bm])/i.exec(size)
  if (match == null) return undefined
  const value = Number.parseFloat(match[1] ?? '')
  if (!Number.isFinite(value)) return undefined
  return match[2]?.toLowerCase() === 'm' ? value / 1000 : value
}

/**
 * Classify a model for the marketplace.
 *
 * @param capabilities - Ollama's capability list.
 * @param parametersB - billions of parameters, when known.
 */
export function tierOf(capabilities: readonly string[], parametersB?: number): ModelTier {
  if (!capabilities.includes('tools')) return 'chat'
  // Unknown size with the tools capability: treat as a light agent rather than
  // claiming it can drive an agent loop.
  if (parametersB == null) return 'light'
  if (parametersB >= AGENT_MIN_BILLIONS) return 'agent'
  if (parametersB >= LIGHT_MIN_BILLIONS) return 'light'
  return 'chat'
}

/** Shape returned by the probe, independent of HTTP plumbing. */
export type OllamaModelFacts = {
  capabilities?: string[]
  parameterSize?: string
}

/**
 * Fold `/api/show` capabilities and `/api/tags` details into one profile.
 * @param model - model name as Ollama knows it.
 * @param facts - whatever the two endpoints reported.
 */
export function profileOf(model: string, facts: OllamaModelFacts): ModelProfile {
  const capabilities = facts.capabilities ?? []
  const parametersB = parseParameterSize(facts.parameterSize)
  return {
    model,
    capabilities,
    ...(facts.parameterSize === undefined ? {} : { parameterSize: facts.parameterSize }),
    ...(parametersB === undefined ? {} : { parametersB }),
    tier: tierOf(capabilities, parametersB),
  }
}
