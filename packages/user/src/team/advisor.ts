// GENKAKU: the model call behind the Agent Routes setup advisor.
//
// `protocol` owns the prompt and the reply parser; this module owns the one
// thing protocol cannot do — call a model. It lives in the user plugin because
// that is where the harness LLM lives, and it is registered on the bridge
// through `setTeamAdvisor`, the same in-process handshake the route catalog
// uses.
//
// The advisor is a one-shot call with a system prompt and no tools: it designs
// a team, it does not join one. It also must never route to `genkaku/team`
// itself, or asking "how should I set up my team" would start a team.

import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import {
  TEAM_MODEL_ID,
  buildAdvicePrompt,
  parseAdviceReply,
  type AdviceInput,
  type AdviceOutput,
  type TeamAdvisor,
  type TeamConfig,
} from '@genkaku/protocol'

import { resolveRoute, type TeamLocalModel } from './route.ts'

export type AdvisorOptions = {
  ctx: Context
  log: (line: string) => void
  /** Live local rows, so "any local worker" resolves at call time. */
  localModels: () => Promise<TeamLocalModel[]>
}

/**
 * The advisor answers in about 600 tokens of prose plus one JSON block. 2,400
 * leaves room for a model that thinks out loud; a local 8B takes 30–60 s for
 * that, which is why the panel shows a spinner and the bridge aborts on close.
 */
const MAX_ADVICE_TOKENS = 2_400

export function createTeamAdvisor(options: AdvisorOptions): TeamAdvisor {
  return async (input: AdviceInput): Promise<AdviceOutput> => {
    const started = Date.now()
    const fail = (error: string): AdviceOutput => ({ reply: '', cards: [], model: null, ms: Date.now() - started, error })

    const config: TeamConfig = input.config
    // A first-time user has no main model yet, so the advisor route is its own
    // field. Once a team exists, the main model is the obvious advisor.
    const chosen = config.advisor ?? config.main
    if (chosen == null) {
      return fail('Choose an advisor model in the panel first — it is the model that will write the suggestions.')
    }

    const local = chosen.provider === 'genkaku' ? await options.localModels() : []
    const route = resolveRoute(chosen, local)
    if (route == null) {
      return fail('No model is available for the advisor route. Pair a worker or pick a cloud model.')
    }
    if (route.provider === 'genkaku' && route.model === TEAM_MODEL_ID) {
      return fail('The team cannot advise on itself. Choose a normal model as the advisor.')
    }

    const { system, user } = buildAdvicePrompt(input)
    const messages = [
      createUserMessage({ content: [{ type: 'text', text: user }], source: { kind: 'user' } }),
    ]

    let text = ''
    try {
      for await (const chunk of options.ctx.llm.stream({
        provider: route.provider,
        model: route.model,
        system,
        messages,
        maxTokens: MAX_ADVICE_TOKENS,
        temperature: 0.4,
        ...(input.signal == null ? {} : { signal: input.signal }),
      })) {
        if (chunk.type === 'text-delta') text += chunk.text
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      options.log(`agent-routes: advisor call failed (${message})`)
      return {
        reply: '',
        cards: [],
        model: { provider: route.provider, model: route.model },
        ms: Date.now() - started,
        error: input.signal?.aborted === true ? 'The request was cancelled.' : message,
      }
    }

    const parsed = parseAdviceReply(text, input.catalog)
    if (parsed.reply === '' && parsed.cards.length === 0) {
      return {
        reply: '',
        cards: [],
        model: { provider: route.provider, model: route.model },
        ms: Date.now() - started,
        error: 'The model returned an empty answer. Try again, or pick a stronger advisor model.',
      }
    }

    return {
      reply: parsed.reply,
      cards: parsed.cards,
      model: { provider: route.provider, model: route.model },
      ms: Date.now() - started,
    }
  }
}
