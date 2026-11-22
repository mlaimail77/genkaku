// GENKAKU: Agent Routes panel.
//
// One main model, up to eight specialists, one delegation tool. The panel is a
// form over `~/.dsh/genkaku/team.json`: the bridge saves the file and the
// adapter reads it, so a save takes effect on the next turn without a restart.
//
// Two things this panel refuses to do:
//
//   * show or ask for an API key. Cloud routes are the ones dsh already has
//     configured; the panel only names them.
//   * hide the delegation record. Every handoff is listed below with the model
//     that actually ran, so "why did the answer come from that model" has an
//     answer in the same screen.

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'

import { t } from './i18n.ts'

type Route = {
  provider: string
  model: string
  prefer?: 'cheapest' | 'fastest' | 'largest'
}

type Agent = {
  id: string
  name: string
  whenToUse: string
  whenNotToUse: string
  examples: string[]
  route: Route
  systemPrompt: string
  maxTokens: number
}

type Config = {
  version: 1
  enabled: boolean
  mode: 'model-decides' | 'router-decides'
  mainSupportsTools: boolean
  main: Route | null
  policy: string
  agents: Agent[]
  maxDelegations: number
  maxConcurrent: number
  updatedAt: number
}

type Decision = {
  at: number
  via: 'tool' | 'router'
  agent: string
  provider: string
  model: string
  ms: number
  ok: boolean
  task?: string
  error?: string
}

type Catalog = {
  providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }>
  local: Array<{ id: string; name: string; tier?: string; pricePerHour?: string }>
}

type Props = {
  get: (path: string) => Promise<Record<string, unknown>>
  post: (path: string, body: unknown) => Promise<Record<string, unknown>>
  onNotice: (text: string | null) => void
}

const MAX_AGENTS = 8
const routeKey = (route: Route | null): string => route == null ? '' : `${route.provider}|${route.model}`
const routeOf = (key: string): Route => {
  const [provider = 'genkaku', model = ''] = key.split('|')
  return { provider, model }
}
const MAX_DELEGATIONS = 6

const caption: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1,
  opacity: 0.6,
  marginBottom: 6,
}
const dim: React.CSSProperties = { opacity: 0.6 }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' }
const box: React.CSSProperties = {
  border: '1px solid rgba(127,137,153,.28)',
  borderRadius: 10,
  padding: 12,
  marginTop: 12,
}
const select: React.CSSProperties = {
  background: 'transparent',
  color: 'inherit',
  border: '1px solid rgba(127,137,153,.35)',
  borderRadius: 6,
  padding: '4px 6px',
  font: 'inherit',
  fontSize: 12,
  maxWidth: 260,
}
const area: React.CSSProperties = {
  ...select,
  width: '100%',
  boxSizing: 'border-box',
  maxWidth: '100%',
  fontFamily: 'inherit',
  resize: 'vertical',
}

function emptyAgent(index: number): Agent {
  return {
    id: `agent-${index}`,
    name: '',
    whenToUse: '',
    whenNotToUse: '',
    examples: [],
    route: { provider: 'genkaku', model: '' },
    systemPrompt: '',
    maxTokens: 2_000,
  }
}

export function AgentRoutes({ get, post, onNotice }: Props) {
  const [config, setConfig] = useState<Config | null>(null)
  const [draft, setDraft] = useState<Config | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [catalog, setCatalog] = useState<Catalog>({ providers: [], local: [] })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openAgent, setOpenAgent] = useState<string | null>(null)
  /** A background refresh must never overwrite an edit in progress. */
  const dirtyRef = useRef(false)

  const apply = useCallback((doc: Record<string, unknown>): void => {
    const next = doc.config as Config | undefined
    if (next == null) return
    setConfig(next)
    setDraft(next)
    setDecisions((doc.decisions as Decision[] | undefined) ?? [])
    if (doc.catalog != null) setCatalog(doc.catalog as Catalog)
  }, [])

  const load = useCallback(async (): Promise<void> => {
    try {
      apply(await get('/genkaku/team'))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [apply, get])

  useEffect(() => { void load() }, [load])

  // The record is written by the adapter on the other side of the same
  // process, so a slow poll is how the panel notices a delegation it did not
  // start. Skipped while the form is dirty, or the poll would eat the edit.
  useEffect(() => {
    const timer = setInterval(() => { if (!dirtyRef.current) void load() }, 20_000)
    return () => clearInterval(timer)
  }, [load])

  const save = useCallback(async (next: Config): Promise<void> => {
    setBusy('save')
    onNotice(null)
    try {
      const doc = await post('/genkaku/team', { config: { ...next, updatedAt: Date.now() } })
      apply(doc)
      const saved = doc.config as Config | undefined
      onNotice(saved?.enabled === true
        ? t('Agent Routes saved. Pick “GenKaKu · Agent Routes” in the chat model picker to use it.')
        : t('Saved, but Agent Routes stays off until it has a main model and at least one specialist.'))
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [apply, onNotice, post])

  const clearDecisions = useCallback(async (): Promise<void> => {
    setBusy('clear')
    try {
      await post('/genkaku/team/decisions/clear', {})
      setDecisions([])
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [onNotice, post])

  if (error != null) {
    return (
      <div style={box}>
        <div style={caption}>{t('Agent Routes')}</div>
        <div style={{ ...dim, fontSize: 12 }}>{error}</div>
      </div>
    )
  }

  if (draft == null) {
    return (
      <div style={box}>
        <div style={caption}>{t('Agent Routes')}</div>
        <div style={{ ...dim, fontSize: 12 }}>{t('Loading…')}</div>
      </div>
    )
  }

  const patch = (changes: Partial<Config>): void => { setDraft({ ...draft, ...changes }) }
  const patchAgent = (id: string, changes: Partial<Agent>): void => {
    patch({ agents: draft.agents.map(agent => agent.id === id ? { ...agent, ...changes } : agent) })
  }
  const dirty = config != null && JSON.stringify(draft) !== JSON.stringify(config)
  dirtyRef.current = dirty
  const mainKey = routeKey(draft.main)

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={caption}>{t('Agent Routes')}</div>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={e => patch({ enabled: e.target.checked })}
          />
          {t('On')}
        </label>
      </div>

      <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
        {t('One main model answers you and hands clearly-matched work to up to eight specialists. Nothing changes until you turn this on and pick the Agent Routes model in the chat picker. Sessions still cost you nothing.')}
      </div>

      <div style={row}>
        <span style={dim}>{t('Who picks the specialist')}</span>
        <select
          style={select}
          value={draft.mode}
          aria-label={t('Who picks the specialist')}
          onChange={e => patch({ mode: e.target.value as Config['mode'] })}
        >
          <option value="model-decides">{t('The main model (delegate tool)')}</option>
          <option value="router-decides">{t('The router (works with chat-only models)')}</option>
        </select>
      </div>

      <div style={row}>
        <span style={dim}>{t('Main model')}</span>
        <select
          style={select}
          value={mainKey}
          aria-label={t('Main model')}
          onChange={e => patch({ main: routeOf(e.target.value) })}
        >
          <option value="">{t('Choose a model')}</option>
          <option value="genkaku|">{t('Any local worker (auto)')}</option>
          <RouteOptions catalog={catalog} />
        </select>
      </div>

      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, ...dim }}>
        <input
          type="checkbox"
          checked={draft.mainSupportsTools}
          onChange={e => patch({ mainSupportsTools: e.target.checked })}
        />
        {t('The main model can call tools (turn this off for a chat-only model)')}
      </label>

      <div style={{ ...caption, marginTop: 14 }}>{t('Specialists')}</div>
      {draft.agents.length === 0 && (
        <div style={{ ...dim, fontSize: 12 }}>{t('No specialists yet. Add one below.')}</div>
      )}

      {draft.agents.map((agent, index) => (
        <div
          key={agent.id}
          style={{
            border: '1px solid rgba(127,137,153,.22)',
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              value={agent.name}
              placeholder={t('Name, e.g. Translator')}
              aria-label={t('Specialist name')}
              onChange={e => patchAgent(agent.id, { name: e.target.value })}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => patch({ agents: draft.agents.filter(row => row.id !== agent.id) })}
            >
              {t('remove')}
            </Button>
          </div>

          <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
            <span style={{ ...dim, fontSize: 11 }}>{t('When the main model should hand work here')}</span>
            <textarea
              style={area}
              rows={2}
              value={agent.whenToUse}
              placeholder={t('Translate or proofread text between Chinese and English.')}
              onChange={e => patchAgent(agent.id, { whenToUse: e.target.value })}
            />
          </div>

          <div style={{ ...row, marginTop: 4 }}>
            <span style={{ ...dim, fontSize: 12 }}>{t('Model')}</span>
            <select
              style={select}
              value={routeKey(agent.route)}
              aria-label={`${t('Model')} ${index + 1}`}
              onChange={e => patchAgent(agent.id, { route: routeOf(e.target.value) })}
            >
              <option value="genkaku|">{t('Any local worker (auto)')}</option>
              <RouteOptions catalog={catalog} />
            </select>
          </div>

          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              opacity: 0.7,
              fontSize: 11,
              padding: 0,
              marginTop: 4,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => setOpenAgent(openAgent === agent.id ? null : agent.id)}
          >
            {openAgent === agent.id ? t('Fewer options') : t('More options')}
          </button>

          {openAgent === agent.id && (
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ ...dim, fontSize: 11 }}>{t('When it should not be used')}</span>
                <textarea
                  style={area}
                  rows={2}
                  value={agent.whenNotToUse}
                  onChange={e => patchAgent(agent.id, { whenNotToUse: e.target.value })}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ ...dim, fontSize: 11 }}>{t('Example tasks, one per line')}</span>
                <textarea
                  style={area}
                  rows={2}
                  value={agent.examples.join('\n')}
                  onChange={e => patchAgent(agent.id, {
                    examples: e.target.value.split('\n').map(line => line.trim()).filter(line => line !== ''),
                  })}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ ...dim, fontSize: 11 }}>{t('Role instructions given to the specialist')}</span>
                <textarea
                  style={area}
                  rows={2}
                  value={agent.systemPrompt}
                  onChange={e => patchAgent(agent.id, { systemPrompt: e.target.value })}
                />
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                <span style={dim}>{t('Max output tokens')}</span>
                <Input
                  value={String(agent.maxTokens)}
                  aria-label={t('Max output tokens')}
                  onChange={e => {
                    const value = Number(e.target.value)
                    if (Number.isFinite(value)) patchAgent(agent.id, { maxTokens: Math.round(value) })
                  }}
                />
              </label>
              <div style={{ ...dim, fontSize: 11 }}>
                {t('Specialist id')}: <code>{agent.id}</code>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null || draft.agents.length >= MAX_AGENTS}
          onClick={() => {
            const agent = emptyAgent(draft.agents.length + 1)
            patch({ agents: [...draft.agents, agent] })
            setOpenAgent(agent.id)
          }}
        >
          {t('Add specialist')}
        </Button>
        {draft.agents.length >= MAX_AGENTS && (
          <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>{t('Eight is the maximum.')}</span>
        )}
      </div>

      <div style={{ ...caption, marginTop: 14 }}>{t('Orchestration notes')}</div>
      <textarea
        style={area}
        rows={3}
        value={draft.policy}
        aria-label={t('Orchestration notes')}
        onChange={e => patch({ policy: e.target.value })}
      />
      <div style={row}>
        <span style={{ ...dim, fontSize: 12 }}>{t('Maximum delegations per turn')}</span>
        <Input
          value={String(draft.maxDelegations)}
          aria-label={t('Maximum delegations per turn')}
          onChange={e => {
            const value = Number(e.target.value)
            if (Number.isFinite(value)) patch({ maxDelegations: Math.round(value) })
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <Button variant="outline" size="sm" disabled={busy !== null || !dirty} onClick={() => { void save(draft) }}>
          {busy === 'save' ? t('Saving…') : t('Save Agent Routes')}
        </Button>
        {dirty && <span style={{ ...dim, fontSize: 11 }}>{t('Unsaved changes')}</span>}
        {!dirty && config != null && (
          <span style={{ ...dim, fontSize: 11 }}>
            {config.updatedAt > 0 ? t('Saved {value}', { value: new Date(config.updatedAt).toLocaleString() }) : ''}
          </span>
        )}
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => { void load() }}>
          {t('Reload')}
        </Button>
      </div>

      <div style={{ ...caption, marginTop: 16 }}>{t('Recent delegations')}</div>
      {decisions.length === 0
        ? <div style={{ ...dim, fontSize: 12 }}>{t('No delegation yet. Ask something a specialist covers.')}</div>
        : (
          <div style={{ display: 'grid', gap: 4 }}>
            {[...decisions].reverse().slice(0, 8).map((decision, index) => (
              <div key={`${decision.at}-${index}`} style={{ fontSize: 12, display: 'grid', gap: 2 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ opacity: decision.ok ? 0.85 : 1, color: decision.ok ? undefined : '#ff8b9a' }}>
                    {decision.ok ? '✓' : '✕'} {decision.agent}
                  </span>
                  <span style={dim}>{decision.via === 'router' ? t('router') : t('model')}</span>
                  <span style={{ ...dim, marginLeft: 'auto' }}>
                    {Math.max(1, Math.round(decision.ms / 100) / 10)}s · {new Date(decision.at).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ ...dim, fontSize: 11 }}>
                  <code>{decision.provider}/{decision.model}</code>
                  {decision.task != null && decision.task !== '' ? ` · ${decision.task}` : ''}
                </div>
                {decision.error != null && decision.error !== '' && (
                  <div style={{ fontSize: 11, color: '#ff8b9a' }}>{decision.error}</div>
                )}
              </div>
            ))}
            <div>
              <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => { void clearDecisions() }}>
                {t('Clear history')}
              </Button>
            </div>
          </div>
        )}

      <div style={{ ...dim, fontSize: 11, marginTop: 10 }}>
        {t('Specialists are full agents: they can read files and use tools. They cannot delegate further, so the team is one level deep.')}
      </div>
    </div>
  )
}

/** The shared model list: cloud routes first, then the live local board. */
function RouteOptions({ catalog }: { catalog: Catalog }) {
  const local = catalog.local.filter(entry => entry.id !== 'team')
  return (
    <>
      {catalog.providers.map(provider => (
        <optgroup key={provider.id} label={provider.name}>
          {provider.models.map(model => (
            <option key={`${provider.id}|${model.id}`} value={`${provider.id}|${model.id}`}>
              {model.name}
            </option>
          ))}
        </optgroup>
      ))}
      {local.length > 0 && (
        <optgroup label={t('GenKaKu network')}>
          {local.map(entry => (
            <option key={entry.id} value={`genkaku|${entry.id}`}>
              {entry.name}{entry.tier === 'agent' ? ` · ${t('agent-ready')}` : ''}
            </option>
          ))}
        </optgroup>
      )}
    </>
  )
}
