// GenKaKu's own locale layer on top of DSH's.
//
// DSH publishes the active language through `ctx.locale`. The plugin follows it
// by default; the panel also offers an explicit override (including Korean,
// which DSH does not ship) stored in localStorage for this browser profile.
// English is the fallback for every missing key, so a partially translated
// build never shows an empty string.

import { LOCALE_LABELS, MESSAGES } from './locales.ts'

export { LOCALE_LABELS }

const STORAGE_KEY = 'genkaku.locale'
/** `auto` follows DSH; any other id is an explicit choice. */
export type LocaleChoice = 'auto' | keyof typeof MESSAGES

type LocaleRuntime = {
  getLocale: () => { active: string }
  subscribe: (listener: () => void) => () => void
}

let runtime: LocaleRuntime | null = null
let choice: LocaleChoice = 'auto'
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function installLocale(ctx: { locale?: LocaleRuntime }): void {
  if (ctx.locale == null) return
  runtime = ctx.locale
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (stored != null && (stored === 'auto' || stored in MESSAGES)) choice = stored as LocaleChoice
  } catch {
    // A browser that refuses storage just follows DSH.
  }

  if (typeof (ctx as { effect?: unknown }).effect === 'function') {
    (ctx as { effect: (fn: () => unknown, label: string) => void }).effect(
      () => runtime!.subscribe(emit),
      'genkaku: locale changes',
    )
  } else {
    runtime.subscribe(emit)
  }
}

export function localeChoice(): LocaleChoice {
  return choice
}

export function setLocaleChoice(next: LocaleChoice): void {
  choice = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next)
  } catch {
    // Keep the in-memory choice for this session.
  }
  emit()
}

/** The language this plugin is actually drawing in. */
export function activeLocale(): string {
  if (choice !== 'auto') return choice
  return runtime?.getLocale().active ?? 'en'
}

function format(text: string, params?: Record<string, string | number>): string {
  if (params == null) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params[name] == null ? whole : String(params[name]))
}

/** Translate one English source string into the current language. */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = activeLocale()
  const dict = (MESSAGES as unknown as Record<string, Record<string, string>>)[locale]
    ?? (MESSAGES as unknown as Record<string, Record<string, string>>).en
  return format(dict[key] ?? (MESSAGES as unknown as Record<string, Record<string, string>>).en[key] ?? key, params)
}

/** Subscribe a component to language/override changes. */
export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The picker's rows, in the order the panel shows them. */
export function localeOptions(): Array<{ id: LocaleChoice; label: string }> {
  return (['auto', 'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt'] as LocaleChoice[])
    .map(id => ({ id, label: id === 'auto' ? `${LOCALE_LABELS.auto} (${runtime?.getLocale().active ?? 'en'})` : LOCALE_LABELS[id] }))
}
