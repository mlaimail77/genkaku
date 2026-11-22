// GENKAKU: Agent Routes runtime.
//
// The panel edits `team.json`; this module turns that file into two live
// behaviours inside the harness:
//
//   * one `delegate` tool, registered only for a step whose model is the
//     synthetic `genkaku/team`. The registry's step-time condition is what
//     keeps the tool invisible to every other model — including cloud models
//     whose requests never pass through our adapter.
//   * a runner that starts a real child Agent for a specialist, with that
//     specialist's own provider/model, and returns its text.
//
// A specialist is a full DSH agent (`spawn`), not a one-shot inference: it can
// read files and use tools. `maxDepth: 0` is what stops a specialist from
// delegating again, so the tree is exactly one level and cannot loop.
//
// Nothing here touches money. The user pays nothing for a session; a tip is a
// separate direct transfer the panel already owns.

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ContentBlock, GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import {
  ToolContextUnavailableError,
  defineTool,
  type ToolDefinition,
  type ToolRunContext,
} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-subagent'

import {
  DEFAULT_TEAM_POLICY,
  TEAM_DELEGATE_TOOL,
  TEAM_MODEL_ID,
  appendTeamDecision,
  readTeamConfig,
  setTeamCatalogProvider,
  watchTeamConfig,
  type TeamAgent,
  type TeamCatalog,
  type TeamConfig,
  type TeamDecision,
} from '@genkaku/protocol'

import { resolveRoute, routeAgent, type ResolvedRoute, type TeamLocalModel } from './route.ts'

/** One specialist's outcome, as both the tool and the router see it. */
export type TeamRunResult = {
  ok: boolean
  agent: string
  provider: string
  model: string
  output: string
  error?: string
}

/** What the adapter needs from this runtime. Kept narrow on purpose. */
export interface TeamHost {
  config(): TeamConfig
  route(task: string): string | null
  runForSession(
    agentId: string,
    task: string,
    sessionId: GenerateOptions['sessionId'],
    signal: AbortSignal,
  ): Promise<TeamRunResult | null>
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>
}

export type TeamRuntimeOptions = {
  keyDir: string
  ctx: Context
  log: (line: string) => void
  /** Live local offers, used by an auto local route. */
  localModels: () => Promise<TeamLocalModel[]>
}

/** How many characters of a specialist description the tool repeats. */
const DESCRIPTION_LIMIT = 400

/** How many characters of the task a decision row keeps. */
const DECISION_TASK_LIMIT = 160

export class TeamRuntime implements TeamHost {
  private disposers: Array<() => void> = []
  private unwatch: (() => void) | null = null
  private childSequence = 0
  /**
   * Per-session delegation budget. A "turn" is not visible from a tool body, so
   * this is a rolling window instead: it bounds a runaway main model that keeps
   * asking for the same work, which is the failure mode that costs the user
   * real wall-clock time. The tool description still states the per-turn limit.
   */
  private budget = new Map<string, { at: number; count: number }>()
  private inFlight = new Map<string, number>()

  constructor(private readonly options: TeamRuntimeOptions) {}

  /** Register the tool and follow the panel's saves. */
  start(): void {
    this.unwatch = watchTeamConfig(() => this.refresh())
    setTeamCatalogProvider(async () => ({ providers: await this.providerCatalog() }))
    this.refresh()
  }

  stop(): void {
    this.unwatch?.()
    this.unwatch = null
    setTeamCatalogProvider(null)
    this.clear()
  }

  config(): TeamConfig {
    return readTeamConfig(this.options.keyDir)
  }

  route(task: string): string | null {
    const config = this.config()
    return routeAgent(config.agents, task)
  }

  stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    return this.options.ctx.llm.stream(options)
  }

  /**
   * Router-mode delegation. The parent is the live Agent for the session; when
   * the adapter is called outside a session there is nothing to spawn from, so
   * this returns null and the adapter answers without a specialist.
   */
  async runForSession(
    agentId: string,
    task: string,
    sessionId: GenerateOptions['sessionId'],
    signal: AbortSignal,
  ): Promise<TeamRunResult | null> {
    const parent = sessionId == null
      ? undefined
      : this.options.ctx.agents.get(
        sessionId as unknown as Parameters<typeof this.options.ctx.agents.get>[0],
      )
    if (parent == null) return null
    return await this.run(agentId, task, parent, signal, 'router')
  }

  /** Rebuild the delegate tool so its enum and description match the file. */
  private refresh(): void {
    this.clear()

    const config = this.config()
    if (!config.enabled || config.agents.length === 0) return

    const ids = config.agents.map(agent => agent.id)
    const parameters = {
      agent: {
        type: 'string' as const,
        enum: ids,
        description: 'The specialist id to hand the task to.',
        required: true as const,
      },
      task: {
        type: 'string' as const,
        description:
          'A complete, self-contained task. Include the context and the desired output; '
          + 'the specialist cannot see this conversation.',
        required: true as const,
      },
    }
    const definition = defineTool({
      name: TEAM_DELEGATE_TOOL,
      description: delegateDescription(config),
      parameters,
      output: {
        schema: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean' as const, required: true as const },
            agent: { type: 'string' as const, required: true as const },
            provider: { type: 'string' as const, required: true as const },
            model: { type: 'string' as const, required: true as const },
            output: { type: 'string' as const, required: true as const },
            error: { type: 'string' as const },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: value.ok
            ? value.output.trim() === ''
              ? `${value.agent} returned no text.`
              : value.output
            : `Delegation to ${value.agent} failed: ${value.error ?? 'unknown error'}`,
        }],
      },
      timeoutMs: 15 * 60_000,
      execute: async (args, exec) => await this.execute(args, exec),
    })

    const when = ({ modelSelection }: { modelSelection: { provider: string; model: string } }): boolean => {
      const current = this.config()
      return current.enabled
        && current.mode === 'model-decides'
        && current.mainSupportsTools
        && modelSelection.provider === 'genkaku'
        && modelSelection.model === TEAM_MODEL_ID
    }

    this.register(definition, when)
  }

  /**
   * A duplicate `delegate` is possible if another plugin owns the name. The
   * team still works under a prefixed name; the model just sees that name.
   */
  private register(
    definition: ToolDefinition,
    when: (context: { modelSelection: { provider: string; model: string } }) => boolean,
  ): void {
    try {
      this.disposers.push(this.options.ctx.tools.register(definition, { when }))
      return
    } catch (error) {
      this.options.log(
        `agent-routes: ${TEAM_DELEGATE_TOOL} is already registered (${messageOf(error)}); using genkaku_${TEAM_DELEGATE_TOOL}`,
      )
    }

    try {
      const renamed: ToolDefinition = { ...definition, name: `genkaku_${TEAM_DELEGATE_TOOL}` }
      this.disposers.push(this.options.ctx.tools.register(renamed, { when }))
    } catch (error) {
      this.options.log(`agent-routes: delegate tool unavailable (${messageOf(error)})`)
    }
  }

  private clear(): void {
    for (const dispose of this.disposers.splice(0)) {
      try {
        dispose()
      } catch {
        // A disposer that already ran is not an error worth surfacing.
      }
    }
  }

  private async execute(
    args: { agent: string; task: string },
    exec: ToolRunContext,
  ): Promise<{
    ok: boolean
    agent: string
    provider: string
    model: string
    output: string
    error?: string
  }> {
    const config = this.config()
    if (!config.enabled) {
      throw new Error('GenKaKu Agent Routes is off. Turn it on in the panel first.')
    }
    const agent = config.agents.find(candidate => candidate.id === args.agent)
    if (agent == null) {
      throw new Error(`No specialist named "${args.agent}" on this team.`)
    }
    if (exec.agent == null) {
      throw new ToolContextUnavailableError(
        'delegate needs a live agent; the call arrived without one',
      )
    }

    const session = exec.agent.session.id as unknown as string
    this.spend(session, config.maxDelegations)
    try {
      const result = await this.run(agent.id, args.task, exec.agent, exec.signal, 'tool')
      if (result == null) {
        throw new Error(`No runnable route for specialist "${agent.id}".`)
      }
      return {
        ok: result.ok,
        agent: result.agent,
        provider: result.provider,
        model: result.model,
        output: result.output,
        ...(result.error == null ? {} : { error: result.error }),
      }
    } finally {
      this.release(session)
    }
  }

  /** Resolve one specialist and run it as a child Agent. */
  private async run(
    agentId: string,
    task: string,
    parent: Agent,
    signal: AbortSignal,
    via: TeamDecision['via'],
  ): Promise<TeamRunResult | null> {
    const config = this.config()
    const agent = config.agents.find(candidate => candidate.id === agentId)
    if (agent == null) return null

    const local = await this.options.localModels()
    const route = resolveRoute(agent.route, local)
    if (route == null) return null

    const started = Date.now()
    try {
      const result = await this.spawn(agent, route, task, parent, signal)
      this.record({
        at: Date.now(),
        via,
        agent: agent.id,
        provider: route.provider,
        model: route.model,
        ms: Date.now() - started,
        ok: result.ok,
        task: task.slice(0, DECISION_TASK_LIMIT),
        ...(result.error == null ? {} : { error: result.error.slice(0, 500) }),
      })
      return {
        ok: result.ok,
        agent: agent.id,
        provider: route.provider,
        model: route.model,
        output: result.output,
        ...(result.error == null ? {} : { error: result.error }),
      }
    } catch (error) {
      this.record({
        at: Date.now(),
        via,
        agent: agent.id,
        provider: route.provider,
        model: route.model,
        ms: Date.now() - started,
        ok: false,
        task: task.slice(0, DECISION_TASK_LIMIT),
        error: messageOf(error).slice(0, 500),
      })
      throw error
    }
  }

  /**
   * Start a full child agent. The role text travels in the prompt because the
   * subagent seam has no per-child system slot; the child still inherits the
   * harness system prompt, tools and permissions, which is what "full agent"
   * means here.
   */
  private async spawn(
    agent: TeamAgent,
    route: ResolvedRoute,
    task: string,
    parent: Agent,
    signal: AbortSignal,
  ): Promise<{ ok: boolean; output: string; error?: string }> {
    if (signal.aborted) throw new Error('delegation was cancelled')

    const role = agent.systemPrompt.trim()
    const prompt = role === '' ? task : `${role}\n\n---\n\n${task}`

    const activation = await this.options.ctx.subagents.startActivation({
      provider: 'spawn',
      parent,
      prompt: [{ type: 'text', text: prompt }] satisfies ContentBlock[],
      label: agent.name,
      name: childName(agent.id, ++this.childSequence),
      delivery: 'caller',
      maxDepth: 0,
      agentOptions: {
        provider: route.provider,
        model: route.model,
        maxTokens: agent.maxTokens,
      },
      signal,
    })

    try {
      const result = await activation.result
      const output = result.output
        .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
        .map(block => block.text)
        .join('')
      return {
        ok: result.stopReason === 'completed',
        output,
        ...(result.diagnostic == null ? {} : { error: result.diagnostic }),
      }
    } finally {
      await activation.dispose().catch(() => {})
    }
  }

  private record(decision: TeamDecision): void {
    appendTeamDecision(this.options.keyDir, decision)
  }

  /**
   * Refuse a delegation that would exceed this session's budget, and one that
   * would run past the configured concurrency. Both are per-session because a
   * team is a conversation, not a queue.
   */
  private spend(session: string, limit: number): void {
    const now = Date.now()
    const window = this.budget.get(session)
    if (window == null || now - window.at > 10 * 60_000) {
      this.budget.set(session, { at: now, count: 1 })
    } else if (window.count >= limit) {
      throw new Error(
        `This turn already used ${window.count} delegation(s), the team limit. `
        + 'Answer with what you have, or ask the user before delegating again.',
      )
    } else {
      window.count += 1
    }

    const running = this.inFlight.get(session) ?? 0
    const max = this.config().maxConcurrent
    if (running >= max) {
      throw new Error(
        `${max} specialist(s) are already running for this session. Wait for them to finish.`,
      )
    }
    this.inFlight.set(session, running + 1)
  }

  private release(session: string): void {
    const running = this.inFlight.get(session) ?? 0
    if (running <= 1) this.inFlight.delete(session)
    else this.inFlight.set(session, running - 1)
  }

  /**
   * Cloud routes the harness already knows about. The bridge adds the local
   * board itself, so `genkaku` is deliberately excluded here.
   */
  private async providerCatalog(): Promise<TeamCatalog['providers']> {
    const llm = this.options.ctx.llm
    const providers: TeamCatalog['providers'] = []
    for (const provider of llm.listProviders()) {
      if (provider.id === 'genkaku') continue
      let models: Array<{ id: string; name: string }> = []
      try {
        models = (await llm.listModels(provider.id))
          .map(model => ({ id: model.id, name: model.name }))
      } catch {
        models = []
      }
      providers.push({ id: provider.id, name: provider.name, models })
    }
    return providers
  }
}

function delegateDescription(config: TeamConfig): string {
  const lines = [
    'Hand one self-contained task to a specialist on this GenKaKu Agent Routes team.',
    'Use it only when the task clearly matches a specialist; answer simple questions yourself.',
    '',
    'Specialists:',
  ]

  for (const agent of config.agents) {
    const when = clip(agent.whenToUse, DESCRIPTION_LIMIT) || 'no description'
    const avoid = clip(agent.whenNotToUse, DESCRIPTION_LIMIT)
    lines.push(`- ${agent.id} (${agent.name}): ${when}`)
    if (avoid !== '') lines.push(`  Do not use for: ${avoid}`)
  }

  const policy = config.policy.trim()
  if (policy !== '' && policy !== DEFAULT_TEAM_POLICY) {
    lines.push('', policy)
  }
  return lines.join('\n')
}

function clip(text: string, limit: number): string {
  const value = text.trim()
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}

function childName(id: string, sequence: number): string {
  const suffix = `-${sequence.toString(36)}`
  const base = id.slice(0, 32 - suffix.length).replace(/-+$/, '')
  return `${base}${suffix}`
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
