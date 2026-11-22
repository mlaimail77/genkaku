// GENKAKU: Agent Routes starter cards.
//
// The empty state used to be "add a specialist", which is the exact moment a
// new user has no idea what to write. These four are the answer: a filled-in
// card that works, one click away, with no model call and no network.
//
// Every string is an i18n key, not literal prose, because a template is product
// copy: it should follow the panel's language. A card that is *saved* keeps
// whatever language it was created in — that is data, not UI.
//
// All four route to "any local worker", which the adapter resolves at call
// time and prefers an agent-capable worker. A template that names a specific
// worker would break the day that worker goes offline.

export type TemplateAgent = {
  id: string
  name: string
  whenToUse: string
  whenNotToUse: string
  examples: string[]
  systemPrompt: string
  maxTokens: number
}

export type Template = {
  id: string
  /** One line on the card, so the choice is not a guess. */
  blurb: string
  agent: TemplateAgent
}

export const TEMPLATES: Template[] = [
  {
    id: 'translator',
    blurb: 'tpl.translator.blurb',
    agent: {
      id: 'translator',
      name: 'tpl.translator.name',
      whenToUse: 'tpl.translator.when',
      whenNotToUse: 'tpl.translator.not',
      examples: ['tpl.translator.ex1', 'tpl.translator.ex2', 'tpl.translator.ex3'],
      systemPrompt: 'tpl.translator.prompt',
      maxTokens: 2_000,
    },
  },
  {
    id: 'researcher',
    blurb: 'tpl.researcher.blurb',
    agent: {
      id: 'researcher',
      name: 'tpl.researcher.name',
      whenToUse: 'tpl.researcher.when',
      whenNotToUse: 'tpl.researcher.not',
      examples: ['tpl.researcher.ex1', 'tpl.researcher.ex2', 'tpl.researcher.ex3'],
      systemPrompt: 'tpl.researcher.prompt',
      maxTokens: 3_000,
    },
  },
  {
    id: 'editor',
    blurb: 'tpl.editor.blurb',
    agent: {
      id: 'editor',
      name: 'tpl.editor.name',
      whenToUse: 'tpl.editor.when',
      whenNotToUse: 'tpl.editor.not',
      examples: ['tpl.editor.ex1', 'tpl.editor.ex2', 'tpl.editor.ex3'],
      systemPrompt: 'tpl.editor.prompt',
      maxTokens: 2_000,
    },
  },
  {
    id: 'coder',
    blurb: 'tpl.coder.blurb',
    agent: {
      id: 'coder',
      name: 'tpl.coder.name',
      whenToUse: 'tpl.coder.when',
      whenNotToUse: 'tpl.coder.not',
      examples: ['tpl.coder.ex1', 'tpl.coder.ex2', 'tpl.coder.ex3'],
      systemPrompt: 'tpl.coder.prompt',
      maxTokens: 3_000,
    },
  },
]
