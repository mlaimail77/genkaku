import { useEffect, useReducer } from 'react'

import { subscribeLocale } from './i18n.ts'

/** Re-render this component when DSH's language or the plugin override changes. */
export function useLocaleVersion(): void {
  const [, force] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribeLocale(force), [force])
}
