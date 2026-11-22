// GENKAKU: Agent Routes panel.
//
// One main model, up to eight specialists, one delegation tool. The panel is a
// form over `~/.dsh/genkaku/team.json`: the bridge saves the file and the
// adapter reads it, so a save takes effect on the next turn without a restart.
//
// Three tabs, because setting a team up is three different jobs:
//
//   * Team     — the live configuration: who answers, who helps, what is saved.
//   * Advisor  — describe your work; the main model proposes the split. This is
//                the answer to "I do not know how to divide my own work".
//   * Cards    — import, keep and share specialists as files or codes. A card
//                never carries a model id that only exists on the sender's
//                machine; it carries a hint that resolves against your board.
//
// Two things this panel refuses to do:
//
//   * show or ask for an API key. Cloud routes are the ones dsh already has
//     configured; the panel only names them.
//   * hide the delegation record. Every handoff is listed with the model that
//     actually ran, so "why did the answer come from that model" has an answer
//     in the same screen.

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'

import { activeLocale, t } from './i18n.ts'
import { TEMPLATES, type Template } from './teamTemplates.ts'

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
  advisor: Route | null
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

type Usage = {
  total: number
  byAgent: Array<{ id: string; name: string; count: number; lastAt: number | null }>
  unused: string[]
}

type Catalog = {
  providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }>
  local: Array<{
    id: string
    name: string
    tier?: string
    pricePerHour?: string
    latencyMs?: number
    parameterSize?: string
  }>
}

/** A specialist as it travels; the shape the bridge reads and writes. */
type Card = {
  genkaku?: string
  id?: string
  name: string
  lang?: string
  tags?: string[]
  author?: { name?: string; wallet?: string }
  notes?: string
  agent: {
    whenToUse: string
    whenNotToUse: string
    examples: string[]
    systemPrompt: string
    maxTokens: number
    routeHint?: unknown
  }
}

type Preview = {
  card: Card
  agent: Agent
  route: Route
  adjusted: boolean
  reason?: string
  libraryId?: string
}

type LibraryRow = {
  id: string
  card: Card
  importedAt: number
  source: string
}

type AdviceMessage = {
  role: 'user' | 'advisor'
  at: number
  text: string
  cards?: Card[]
  model?: { provider: string; model: string }
  mode?: 'advise' | 'review' | 'rewrite'
  agentId?: string
}

type Thread = { version: 1; messages: AdviceMessage[]; updatedAt: number }

type Props = {
  get: (path: string) => Promise<Record<string, unknown>>
  post: (path: string, body: unknown) => Promise<Record<string, unknown>>
  onNotice: (text: string | null) => void
}

type Tab = 'team' | 'advisor' | 'cards'

const MAX_AGENTS = 8

const routeKey = (route: Route | null): string => route == null ? '' : `${route.provider}|${route.model}`
const routeOf = (key: string): Route => {
  const [provider = 'genkaku', model = ''] = key.split('|')
  return { provider, model }
}
const routeLabel = (route: Route | null): string => {
  if (route == null) return ''
  if (route.provider === 'genkaku') return route.model === '' ? t('Any local worker (auto)') : route.model
  return `${route.provider} / ${route.model}`
}

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
const tabButton = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(127,137,153,.18)' : 'none',
  border: '1px solid rgba(127,137,153,.35)',
  borderRadius: 6,
  color: 'inherit',
  font: 'inherit',
  fontSize: 12,
  padding: '3px 10px',
  cursor: 'pointer',
  opacity: active ? 1 : 0.65,
})
const link: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  opacity: 0.7,
  fontSize: 11,
  padding: 0,
  cursor: 'pointer',
  textDecoration: 'underline',
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
  const [usage, setUsage] = useState<Usage | null>(null)
  const [catalog, setCatalog] = useState<Catalog>({ providers: [], local: [] })
  const [tab, setTab] = useState<Tab>('team')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openAgent, setOpenAgent] = useState<string | null>(null)
  /** The share box, lifted so a specialist written here and a library card share one panel. */
  const [share, setShare] = useState<{ name: string; card: Card; code: string; url: string } | null>(null)
  /** A background refresh must never overwrite an edit in progress. */
  const dirtyRef = useRef(false)

  const apply = useCallback((doc: Record<string, unknown>): void => {
    const next = doc.config as Config | undefined
    if (next == null) return
    setConfig(next)
    setDraft(next)
    setDecisions((doc.decisions as Decision[] | undefined) ?? [])
    if (doc.usage != null) setUsage(doc.usage as Usage)
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

  /**
   * Add a specialist to the draft. The id comes from the bridge or the
   * template; a collision inside the *draft* (which the bridge cannot see) is
   * resolved here, so the id the user reads is the id that gets saved.
   */
  const addAgent = (agent: Agent, note: string): void => {
    if (draft.agents.length >= MAX_AGENTS) {
      onNotice(t('Eight is the maximum. Remove one first.'))
      return
    }
    const taken = new Set(draft.agents.map(row => row.id))
    let id = agent.id
    let suffix = 2
    while (taken.has(id)) {
      const tail = `-${suffix++}`
      id = `${agent.id.slice(0, 32 - tail.length)}${tail}`
    }
    patch({ agents: [...draft.agents, { ...agent, id }] })
    onNotice(note)
  }

  /** A rewrite replaces the specialist in place; the id stays, so the record does too. */
  const replaceAgent = (id: string, agent: Agent): void => {
    patch({
      agents: draft.agents.map(row => row.id === id ? { ...agent, id } : row),
    })
    onNotice(t('Replaced {name} in the draft. Save to keep it.', { name: agent.name }))
  }

  const addTemplate = (template: Template): void => {
    addAgent({
      id: template.agent.id,
      name: t(template.agent.name),
      whenToUse: t(template.agent.whenToUse),
      whenNotToUse: t(template.agent.whenNotToUse),
      examples: template.agent.examples.map(key => t(key)),
      route: { provider: 'genkaku', model: '' },
      systemPrompt: t(template.agent.systemPrompt),
      maxTokens: template.agent.maxTokens,
    }, t('{name} was added to the draft. Save to keep it.', { name: t(template.agent.name) }))
  }

  /**
   * Share either a library card or a specialist written here. The bridge owns
   * the route→hint conversion, so an unsaved draft can be shared without
   * saving it first and without the panel re-implementing the format.
   */
  const shareCard = useCallback(async (value: { card?: Card; agent?: Agent }): Promise<void> => {
    setBusy('share')
    onNotice(null)
    try {
      const doc = await post('/genkaku/team/cards/share', {
        ...(value.card == null ? {} : { card: value.card }),
        ...(value.agent == null ? {} : { agent: value.agent }),
        lang: activeLocale(),
      })
      const card = doc.card as Card | undefined
      setShare({
        name: card?.name ?? value.agent?.name ?? value.card?.name ?? '',
        card: card ?? (value.card as Card),
        code: String(doc.code ?? ''),
        url: String(doc.url ?? ''),
      })
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [onNotice, post])

  const copy = useCallback((text: string): void => {
    void navigator.clipboard?.writeText(text)
    onNotice(t('Copied.'))
  }, [onNotice])

  const download = useCallback((card: Card): void => {
    const blob = new Blob([`${JSON.stringify(card, undefined, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${card.id ?? 'card'}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }, [])

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

      <div style={{ display: 'flex', gap: 6, margin: '2px 0 10px' }}>
        <button type="button" style={tabButton(tab === 'team')} onClick={() => setTab('team')}>
          {t('Team')}
        </button>
        <button type="button" style={tabButton(tab === 'advisor')} onClick={() => setTab('advisor')}>
          {t('Advisor')}
        </button>
        <button type="button" style={tabButton(tab === 'cards')} onClick={() => setTab('cards')}>
          {t('Card library')}
        </button>
      </div>

      {tab === 'team' && (
        <TeamTab
          draft={draft}
          catalog={catalog}
          decisions={decisions}
          usage={usage}
          busy={busy}
          openAgent={openAgent}
          setOpenAgent={setOpenAgent}
          patch={patch}
          patchAgent={patchAgent}
          addTemplate={addTemplate}
          clearDecisions={async () => {
            setBusy('clear')
            try {
              await post('/genkaku/team/decisions/clear', {})
              setDecisions([])
            } catch (e) {
              onNotice(e instanceof Error ? e.message : String(e))
            } finally {
              setBusy(null)
            }
          }}
          goAdvisor={() => setTab('advisor')}
          goCards={() => setTab('cards')}
          onShare={(agent) => { void shareCard({ agent }) }}
        />
      )}

      {tab === 'advisor' && (
        <AdvisorTab
          get={get}
          post={post}
          draft={draft}
          catalog={catalog}
          busy={busy}
          setBusy={setBusy}
          onNotice={onNotice}
          patch={patch}
          addAgent={addAgent}
          replaceAgent={replaceAgent}
        />
      )}

      {tab === 'cards' && (
        <CardsTab
          get={get}
          post={post}
          busy={busy}
          setBusy={setBusy}
          onNotice={onNotice}
          addAgent={addAgent}
          agents={draft.agents}
          onShare={(card) => { void shareCard({ card }) }}
        />
      )}

      {share != null && (
        <div style={{ ...box, marginTop: 12 }}>
          <div style={caption}>{t('Share “{name}”', { name: share.name })}</div>
          <div style={{ ...dim, fontSize: 11, marginBottom: 6 }}>
            {t('Send the link, or the code itself. The link keeps the payload in the fragment, so the site never receives it.')}
          </div>
          <textarea style={area} rows={2} readOnly value={share.url} aria-label={t('Share link')} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" onClick={() => copy(share.url)}>{t('Copy link')}</Button>
            <Button variant="ghost" size="sm" onClick={() => copy(share.code)}>{t('Copy code')}</Button>
            <Button variant="ghost" size="sm" onClick={() => download(share.card)}>{t('Download file')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShare(null)}>{t('Done')}</Button>
          </div>
          <textarea style={{ ...area, marginTop: 6, fontSize: 11 }} rows={3} readOnly value={share.code} aria-label={t('Share code')} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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

      <div style={{ ...dim, fontSize: 11, marginTop: 10 }}>
        {t('Specialists are full agents: they can read files and use tools. They cannot delegate further, so the team is one level deep.')}
      </div>
    </div>
  )
}

// ── Team ─────────────────────────────────────────────────────────────────────

function TeamTab({
  draft,
  catalog,
  decisions,
  usage,
  busy,
  openAgent,
  setOpenAgent,
  patch,
  patchAgent,
  addTemplate,
  clearDecisions,
  goAdvisor,
  goCards,
  onShare,
}: {
  draft: Config
  catalog: Catalog
  decisions: Decision[]
  usage: Usage | null
  busy: string | null
  openAgent: string | null
  setOpenAgent: (id: string | null) => void
  patch: (changes: Partial<Config>) => void
  patchAgent: (id: string, changes: Partial<Agent>) => void
  addTemplate: (template: Template) => void
  clearDecisions: () => Promise<void>
  goAdvisor: () => void
  goCards: () => void
  onShare: (agent: Agent) => void
}) {
  const unused = new Set(usage?.unused ?? [])

  return (
    <>
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
          value={routeKey(draft.main)}
          aria-label={t('Main model')}
          onChange={e => patch({ main: e.target.value === '' ? null : routeOf(e.target.value) })}
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
        <div style={{ marginBottom: 8 }}>
          <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
            {t('No specialists yet. Start from a template, ask the advisor, or import a card.')}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {TEMPLATES.map(template => (
              <div key={template.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => addTemplate(template)}>
                  {t(template.agent.name)}
                </Button>
                <span style={{ ...dim, fontSize: 11 }}>{t(template.blurb)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="ghost" size="sm" onClick={goAdvisor}>{t('Ask the advisor')}</Button>
            <Button variant="ghost" size="sm" onClick={goCards}>{t('Import a card')}</Button>
          </div>
        </div>
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

          {unused.has(agent.id) && usage != null && usage.total > 0 && (
            <div style={{ ...dim, fontSize: 11, marginTop: 2 }}>
              {t('Never used yet. If it keeps not matching, rewrite it or remove it.')}
            </div>
          )}

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
            style={{ ...link, marginTop: 4 }}
            onClick={() => setOpenAgent(openAgent === agent.id ? null : agent.id)}
          >
            {openAgent === agent.id ? t('Fewer options') : t('More options')}
          </button>
          {' · '}
          <button
            type="button"
            style={link}
            disabled={busy !== null}
            onClick={() => onShare(agent)}
          >
            {t('Share')}
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
    </>
  )
}

// ── Advisor ──────────────────────────────────────────────────────────────────

function AdvisorTab({
  get,
  post,
  draft,
  catalog,
  busy,
  setBusy,
  onNotice,
  patch,
  addAgent,
  replaceAgent,
}: {
  get: (path: string) => Promise<Record<string, unknown>>
  post: (path: string, body: unknown) => Promise<Record<string, unknown>>
  draft: Config
  catalog: Catalog
  busy: string | null
  setBusy: (value: string | null) => void
  onNotice: (text: string | null) => void
  patch: (changes: Partial<Config>) => void
  addAgent: (agent: Agent, note: string) => void
  replaceAgent: (id: string, agent: Agent) => void
}) {
  const [thread, setThread] = useState<Thread>({ version: 1, messages: [], updatedAt: 0 })
  const [previews, setPreviews] = useState<Preview[]>([])
  const [question, setQuestion] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const doc = await get('/genkaku/team/advice')
      setThread((doc.thread as Thread | undefined) ?? { version: 1, messages: [], updatedAt: 0 })
      setPreviews((doc.previews as Preview[] | undefined) ?? [])
    } catch {
      // The advisor is optional; the rest of the panel still works.
    } finally {
      setLoaded(true)
    }
  }, [get])

  useEffect(() => { void load() }, [load])

  const ask = useCallback(async (
    mode: 'advise' | 'review' | 'rewrite',
    text: string,
    agentId?: string,
  ): Promise<void> => {
    setBusy('advice')
    onNotice(null)
    try {
      const doc = await post('/genkaku/team/advice', {
        mode,
        question: text,
        locale: activeLocale(),
        ...(agentId == null ? {} : { agentId }),
      })
      setThread((doc.thread as Thread | undefined) ?? thread)
      setPreviews((doc.previews as Preview[] | undefined) ?? [])
      setQuestion('')
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [onNotice, post, setBusy, thread])

  const clear = useCallback(async (): Promise<void> => {
    setBusy('advice-clear')
    try {
      const doc = await post('/genkaku/team/advice/clear', {})
      setThread((doc.thread as Thread | undefined) ?? { version: 1, messages: [], updatedAt: 0 })
      setPreviews([])
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [onNotice, post, setBusy])

  /** Apply an older suggestion: the bridge resolves the route again. */
  const applyCard = useCallback(async (card: Card, replaceId?: string): Promise<void> => {
    setBusy('advice-apply')
    try {
      const doc = await post('/genkaku/team/cards', { card, save: false })
      const first = (doc.previews as Preview[] | undefined)?.[0]
      if (first == null) {
        onNotice(t('That card could not be read.'))
        return
      }
      if (replaceId != null) {
        replaceAgent(replaceId, first.agent)
        return
      }
      addAgent(first.agent, t('{name} was added to the draft. Save to keep it.', { name: first.agent.name }))
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [addAgent, onNotice, post, replaceAgent, setBusy])

  const advisorRoute = draft.advisor ?? draft.main
  const lastAdvisor = [...thread.messages].reverse().find(message => message.role === 'advisor')
  // A rewrite replaces a specialist; it must not append a second one with the
  // same job. The target comes from the thread, so a reload behaves the same.
  const rewriteTarget = lastAdvisor?.mode === 'rewrite'
    && lastAdvisor.agentId != null
    && draft.agents.some(agent => agent.id === lastAdvisor.agentId)
    ? lastAdvisor.agentId
    : undefined
  const [rewriteId, setRewriteId] = useState('')

  return (
    <>
      <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
        {t('Describe what you actually ask an AI to do. The advisor proposes how to split it, and you apply the parts you agree with. This is one model call: free on the network, or your own key on a cloud model.')}
      </div>

      <div style={row}>
        <span style={dim}>{t('Advisor model')}</span>
        <select
          style={select}
          value={routeKey(advisorRoute)}
          aria-label={t('Advisor model')}
          onChange={e => patch({ advisor: e.target.value === '' ? null : routeOf(e.target.value) })}
        >
          <option value="">{t('Choose a model')}</option>
          <option value="genkaku|">{t('Any local worker (auto)')}</option>
          <RouteOptions catalog={catalog} />
        </select>
      </div>
      <div style={{ ...dim, fontSize: 11, marginBottom: 8 }}>
        {draft.advisor == null && draft.main != null
          ? t('Following the main model. Pick one here to use a different model for advice.')
          : ''}
      </div>

      <textarea
        style={area}
        rows={4}
        value={question}
        aria-label={t('What do you ask an AI to do?')}
        placeholder={t('For example: I work in patent filings. I translate between Chinese and English, look up statute numbers, and turn examiner objections into a reply outline.')}
        onChange={e => setQuestion(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => { void ask('advise', question) }}
        >
          {busy === 'advice' ? t('Thinking…') : t('Suggest a team')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy !== null || draft.agents.length === 0}
          onClick={() => { void ask('review', '') }}
        >
          {t('Review my team')}
        </Button>
        {thread.messages.length > 0 && (
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => { void clear() }}>
            {t('Clear')}
          </Button>
        )}
      </div>

      {draft.agents.length > 0 && (
        <div style={{ ...row, marginTop: 8, alignItems: 'center' }}>
          <span style={{ ...dim, fontSize: 12 }}>{t('Rewrite one specialist')}</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <select
              style={{ ...select, maxWidth: 180 }}
              value={rewriteId}
              aria-label={t('Rewrite one specialist')}
              onChange={e => setRewriteId(e.target.value)}
            >
              <option value="">{t('Choose a specialist')}</option>
              {draft.agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null || rewriteId === ''}
              onClick={() => { void ask('rewrite', question, rewriteId) }}
            >
              {t('Rewrite')}
            </Button>
          </span>
        </div>
      )}

      {!loaded && <div style={{ ...dim, fontSize: 12, marginTop: 10 }}>{t('Loading…')}</div>}

      {loaded && thread.messages.length === 0 && (
        <div style={{ ...dim, fontSize: 12, marginTop: 10 }}>
          {t('Nothing asked yet. Three sentences about your work is enough to start.')}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        {thread.messages.map((message, index) => (
          <div key={`${message.at}-${index}`}>
            <div style={{ ...dim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {message.role === 'user' ? t('You') : t('Advisor')}
              {message.model != null ? ` · ${message.model.provider}/${message.model.model}` : ''}
            </div>
            <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 2 }}>
              {message.role === 'user' && message.text === '' ? t('Review my team') : message.text}
            </div>
            {message.role === 'advisor' && message.cards != null && message.cards.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {message.cards.map((card, cardIndex) => {
                  // The newest answer carries resolved routes; an older one in
                  // the thread is applied through the card endpoint instead.
                  const preview = index === thread.messages.length - 1
                    ? previews[cardIndex]
                    : undefined
                  const replaces = message.mode === 'rewrite' && rewriteTarget != null
                  const replaceId = replaces ? rewriteTarget : undefined
                  return (
                    <CardView
                      key={`${card.name}-${cardIndex}`}
                      card={card}
                      preview={preview}
                      busy={busy !== null}
                      applyLabel={replaceId == null ? undefined : t('Replace {name}', {
                        name: draft.agents.find(agent => agent.id === replaceId)?.name ?? '',
                      })}
                      onApply={() => {
                        if (preview == null) {
                          void applyCard(card, replaceId)
                          return
                        }
                        if (replaceId != null) {
                          replaceAgent(replaceId, preview.agent)
                          return
                        }
                        addAgent(preview.agent, t('{name} was added to the draft. Save to keep it.', { name: preview.agent.name }))
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Cards ────────────────────────────────────────────────────────────────────

function CardsTab({
  get,
  post,
  busy,
  setBusy,
  onNotice,
  addAgent,
  agents,
  onShare,
}: {
  get: (path: string) => Promise<Record<string, unknown>>
  post: (path: string, body: unknown) => Promise<Record<string, unknown>>
  busy: string | null
  setBusy: (value: string | null) => void
  onNotice: (text: string | null) => void
  addAgent: (agent: Agent, note: string) => void
  agents: Agent[]
  onShare: (card: Card) => void
}) {
  const [library, setLibrary] = useState<LibraryRow[]>([])
  const [previews, setPreviews] = useState<Record<string, Preview>>({})
  const [paste, setPaste] = useState('')
  const [loaded, setLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const apply = useCallback((doc: Record<string, unknown>): void => {
    setLibrary(((doc.library as { cards?: LibraryRow[] } | undefined)?.cards) ?? [])
    const map: Record<string, Preview> = {}
    for (const preview of (doc.previews as Preview[] | undefined) ?? []) {
      if (preview.libraryId != null) map[preview.libraryId] = preview
    }
    setPreviews(map)
  }, [])

  const load = useCallback(async (): Promise<void> => {
    try {
      apply(await get('/genkaku/team/cards'))
    } catch {
      // A bridge without the card routes still shows the import box.
    } finally {
      setLoaded(true)
    }
  }, [apply, get])

  useEffect(() => { void load() }, [load])

  const importText = useCallback(async (text: string, source: string): Promise<void> => {
    const value = text.trim()
    if (value === '') return
    setBusy('cards-import')
    onNotice(null)
    try {
      const body = value.startsWith('gkcard1.')
        ? { code: value, source }
        : { document: JSON.parse(value), source }
      const doc = await post('/genkaku/team/cards', body)
      apply(doc)
      const count = (doc.previews as Preview[] | undefined)?.length ?? 0
      onNotice(t('Imported {count} card(s). Apply one to add it to the team.', { count }))
      setPaste('')
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [apply, onNotice, post, setBusy])

  const remove = useCallback(async (id: string): Promise<void> => {
    setBusy(`cards-remove:${id}`)
    try {
      apply(await post('/genkaku/team/cards', { remove: id }))
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [apply, onNotice, post, setBusy])

  return (
    <>
      <div style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
        {t('A card is one specialist as a file. The model it suggests is resolved against your own board when you apply it, so a card from another machine still works. Cards only carry specialist text — never a model id, a key, or a limit.')}
      </div>

      <div style={{ ...caption }}>{t('Import')}</div>
      <textarea
        style={area}
        rows={3}
        value={paste}
        aria-label={t('Paste a card, a pack, or a share code')}
        placeholder={t('Paste a card, a pack, or a share code (gkcard1.…)')}
        onChange={e => setPaste(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null || paste.trim() === ''}
          onClick={() => { void importText(paste, 'paste') }}
        >
          {busy === 'cards-import' ? t('Importing…') : t('Import')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          {t('Choose a file…')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,text/plain"
          multiple
          style={{ display: 'none' }}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ''
            for (const file of files) {
              void file.text().then(text => importText(text, 'file'))
            }
          }}
        />
      </div>

      <div style={{ ...caption, marginTop: 14 }}>{t('Card library')}</div>
      {!loaded && <div style={{ ...dim, fontSize: 12 }}>{t('Loading…')}</div>}
      {loaded && library.length === 0 && (
        <div style={{ ...dim, fontSize: 12 }}>{t('No cards yet. Import one above.')}</div>
      )}

      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
        {library.map(row => (
          <div key={row.id} style={{ display: 'grid', gap: 4 }}>
            <CardView
              card={row.card}
              preview={previews[row.id]}
              busy={busy !== null}
              onApply={() => {
                const preview = previews[row.id]
                if (preview == null) {
                  onNotice(t('That card could not be resolved. Reload and try again.'))
                  return
                }
                addAgent(preview.agent, t('{name} was added to the draft. Save to keep it.', { name: preview.agent.name }))
              }}
              extra={(
                <>
                  <button type="button" style={link} disabled={busy !== null} onClick={() => onShare(row.card)}>
                    {t('Share')}
                  </button>
                  <button
                    type="button"
                    style={link}
                    disabled={busy !== null}
                    onClick={() => { void remove(row.id) }}
                  >
                    {t('remove')}
                  </button>
                </>
              )}
            />
            <div style={{ ...dim, fontSize: 10, marginLeft: 2 }}>
              {row.source}{row.importedAt > 0 ? ` · ${new Date(row.importedAt).toLocaleDateString()}` : ''}
              {agents.some(agent => agent.name === row.card.name) ? ` · ${t('already in the team')}` : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...dim, fontSize: 11, marginTop: 10 }}>
        {t('A card is instructions for an agent that can read files. Read the role text before you apply a card from someone you do not know.')}
      </div>
    </>
  )
}

// ── Shared ───────────────────────────────────────────────────────────────────

/**
 * One card: what it does, when it should not be used, and the model this
 * machine would actually run. The resolved model is the important line — a
 * card that silently picks a model for you is worse than no preview at all.
 */
function CardView({
  card,
  preview,
  busy,
  onApply,
  applyLabel,
  extra,
}: {
  card: Card
  preview?: Preview
  busy: boolean
  onApply: () => void
  /** "Replace Translator" when the card is a rewrite rather than an addition. */
  applyLabel?: string
  extra?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ border: '1px solid rgba(127,137,153,.22)', borderRadius: 8, padding: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>{card.name}</strong>
        {preview != null && (
          <span style={{ ...dim, fontSize: 11 }}>{routeLabel(preview.route)}</span>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
          <Button variant="outline" size="sm" disabled={busy} onClick={onApply}>
            {applyLabel ?? t('Apply')}
          </Button>
          {extra}
        </span>
      </div>

      {preview?.adjusted === true && (
        <div style={{ fontSize: 11, color: '#e0a34a', marginTop: 4 }}>
          {t('Adjusted for your machine: {reason}.', { reason: preview.reason ?? t('that model is not available') })}
        </div>
      )}

      <div style={{ fontSize: 12, marginTop: 4 }}>{card.agent.whenToUse}</div>
      {card.agent.whenNotToUse !== '' && (
        <div style={{ ...dim, fontSize: 11, marginTop: 2 }}>
          {t('Not for')}: {card.agent.whenNotToUse}
        </div>
      )}
      {card.notes != null && card.notes !== '' && (
        <div style={{ ...dim, fontSize: 11, marginTop: 2 }}>{card.notes}</div>
      )}

      <button type="button" style={{ ...link, marginTop: 4 }} onClick={() => setOpen(!open)}>
        {open ? t('Fewer options') : t('More options')}
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
          {card.agent.examples.length > 0 && (
            <div style={{ ...dim, fontSize: 11 }}>
              {t('Examples')}: {card.agent.examples.join(' · ')}
            </div>
          )}
          {card.agent.systemPrompt !== '' && (
            <div>
              <div style={{ ...dim, fontSize: 11 }}>{t('Role instructions (read before applying)')}</div>
              <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', marginTop: 2 }}>{card.agent.systemPrompt}</div>
            </div>
          )}
          <div style={{ ...dim, fontSize: 11 }}>
            {t('Specialist id')}: <code>{preview?.agent.id ?? card.id ?? '—'}</code>
            {' · '}{t('Max output tokens')}: {card.agent.maxTokens}
            {card.author?.name != null && card.author.name !== '' ? ` · ${t('Author')}: ${card.author.name}` : ''}
          </div>
        </div>
      )}
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
