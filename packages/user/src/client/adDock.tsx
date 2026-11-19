/**
 * GenKaKu sponsored placements at the end of the conversation.
 *
 * The card sits in ui-chat's `conversation.chat.turnTail` seat, so it renders
 * under the closing prose of a completed Turn exactly where ChatGPT puts an
 * ad — not in a status strip under the composer. It is a card, not wallpaper:
 *
 *   * it says SPONSORED in the first thing a reader sees;
 *   * it never enters the model's context;
 *   * the bridge decides one placement per eligible turn (never the first
 *     exchange, never within five minutes of the last one) and clears it when
 *     the next prompt arrives, so only the newest Turn can show it;
 *   * dismissing it hides it until the next placement.
 *
 * An impression is counted only when the card is actually looked at: the tab
 * has focus, the card is on screen, and it has stayed that way for a second.
 * That rule exists so a sponsor pays for attention, not for a page that
 * happened to be open in a background window.
 */

import { useEffect, useRef, useState, type ReactElement } from 'react'

import { discoverOrigin } from './bridgeOrigin.ts'
import { t } from './i18n.ts'
import { useLocaleVersion } from './useLocale.tsx'

type AdWire = {
  id?: string
  category?: string
  sponsor?: string
  title?: string
  body?: string
  url?: string
  cta?: { label?: string; url?: string }
  image?: { url?: string; alt?: string }
}

type AdReply = {
  ad?: AdWire | null
  turn?: number
  mode?: string
  revision?: string
}

/** TurnTail owner props we read (the slot also hands us `openFile`). */
type TurnTailProps = {
  turn?: { turn?: number; end?: unknown }
  /** Session-standard selector over the Chat target. */
  useChat?: <T>(selector: (snapshot: any) => T) => T
}

const POLL_MS = 3_000
const DWELL_MS = 1_000
/**
 * A strip, not a poster: 128pt is enough for the picture, one title line, and
 * two lines of copy while leaving the answer the centre of attention.
 */
const CARD_HEIGHT = 128

/** Used when ui-chat did not hand us its selector hook (older hosts). */
const noChatHook = (): undefined => undefined

export function AdDock(props: TurnTailProps): ReactElement | null {
  useLocaleVersion()
  const [ad, setAd] = useState<AdWire | null>(null)
  const [turn, setTurn] = useState(0)
  const [dismissed, setDismissed] = useState<number | null>(null)
  const shownTurn = useRef<number | null>(null)
  const reported = useRef<Set<string>>(new Set())
  const rowRef = useRef<HTMLElement | null>(null)
  const [dwelled, setDwelled] = useState(false)
  // A broken picture must leave the card readable, not blank: the text is the
  // ad, the image is decoration.
  const [imageBroken, setImageBroken] = useState(false)

  // Every completed Turn renders this seat. Only the newest one may carry the
  // card, or an old answer would keep a stale placement alive below it.
  const useChat = props.useChat ?? noChatHook
  const latestTurn = useChat(snapshot => snapshot?.navigation?.items?.().at(-1)?.turn as number | undefined)
  const thisTurn = props.turn?.turn
  const isLatest = latestTurn == null ? true : thisTurn === latestTurn
  const closed = props.turn?.end != null

  useEffect(() => {
    if (!isLatest || !closed) {
      setAd(null)

      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async (): Promise<void> => {
      const origin = await discoverOrigin()

      if (origin == null || cancelled) return

      try {
        const res = await fetch(`${origin}/genkaku/ad`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(4_000),
        })

        if (!res.ok) return

        const doc = (await res.json()) as AdReply
        if (cancelled) return

        const next = doc.ad ?? null
        const nextTurn = typeof doc.turn === 'number' ? doc.turn : 0

        setAd(previous => (previous?.id === next?.id ? previous : next))
        setTurn(nextTurn)
      } catch {
        // The bridge is restarting or the service is down: keep the last card
        // rather than flashing it in and out.
      }
    }

    void poll()
    timer = setInterval(() => { void poll() }, POLL_MS)

    return () => {
      cancelled = true
      if (timer != null) clearInterval(timer)
    }
  }, [isLatest, closed, thisTurn])

  // A new placement resets the dismissal and the dwell measurement.
  useEffect(() => {
    if (ad == null) return
    if (shownTurn.current === turn) return
    shownTurn.current = turn
    setDwelled(false)
    setImageBroken(false)
  }, [ad, turn])

  // "Looked at" = focused document + visible card + one second of both.
  useEffect(() => {
    if (ad == null || dwelled) return
    const row = rowRef.current
    if (row == null) return

    let visible = false
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)
      if (!visible) clearTimeout(timer)
      else schedule()
    }, { threshold: [0.5] })

    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = (): void => {
      if (timer != null) return
      if (!document.hasFocus()) return
      timer = setTimeout(() => {
        timer = null
        if (document.hasFocus() && visible) setDwelled(true)
      }, DWELL_MS)
    }

    const onFocus = (): void => { schedule() }
    observer.observe(row)
    window.addEventListener('focus', onFocus)

    return () => {
      observer.disconnect()
      window.removeEventListener('focus', onFocus)
      if (timer != null) clearTimeout(timer)
    }
  }, [ad, dwelled])

  // One impression per (creative, turn). The bridge records it; the ads service
  // is told in the background and may be down.
  useEffect(() => {
    if (ad == null || !dwelled) return
    const creativeId = ad.id ?? ''
    if (creativeId === '') return
    const key = `${creativeId}#${turn}`
    if (reported.current.has(key)) return
    reported.current.add(key)

    void (async () => {
      const origin = await discoverOrigin()
      if (origin == null) return
      try {
        await fetch(`${origin}/genkaku/ad/impression`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ creativeId, category: ad.category ?? '', turnsSince: turn }),
          signal: AbortSignal.timeout(4_000),
        })
      } catch {
        // Counted as lost attention, not as an error the user must see.
      }
    })()
  }, [ad, dwelled, turn])

  if (ad == null || !isLatest || !closed) return null
  if (dismissed === turn) return null

  // A card with a button is countable and goes through our redirect; a card
  // without one keeps the plain link it always had. If the button is half
  // formed, fall back rather than render a dead control.
  const ctaHref = ad.cta?.url ?? ad.url
  const ctaLabel = ad.cta?.label == null || ctaHref == null ? null : ad.cta.label
  const href = ctaHref ?? ad.url
  const sponsor = ad.sponsor ?? 'GenKaKu'
  const hasImage = ad.image?.url != null && !imageBroken

  return (
    <aside
      ref={rowRef}
      aria-label={t('Sponsored')}
      // A strip, not a poster: one line of picture, one of title, and the
      // button at the end. `order` keeps it below the assistant's action row
      // in the turn-tail column, which is a flex column with the actions last.
      style={{
        order: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        minHeight: CARD_HEIGHT,
        height: CARD_HEIGHT,
        marginTop: 0,
        border: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.22))',
        borderRadius: 14,
        background: 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06))',
        overflow: 'hidden',
      }}
    >
      {!hasImage
        ? null
        : (
          <div
            style={{
              flex: '0 0 168px',
              background: 'var(--dsw-alias-fill-l2, rgba(127,127,127,0.08))',
              overflow: 'hidden',
            }}
          >
            <img
              src={ad.image!.url}
              alt={ad.image?.alt ?? ''}
              loading="lazy"
              onError={() => setImageBroken(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: 4,
          // Head space: the strip starts at the top instead of floating the
          // copy in the middle, so the badge lines up with the picture's top.
          padding: '14px 16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            opacity: 0.62,
            border: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
            borderRadius: 999,
            padding: '2px 7px',
            whiteSpace: 'nowrap',
          }}>
            {t('Sponsored')}
          </span>
          <span style={{ fontSize: 11.5, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sponsor}
          </span>
        </div>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {href == null || ctaLabel != null
            ? ad.title ?? ''
            : (
              <a
                href={href}
                target="_blank"
                rel="sponsored noreferrer noopener"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {ad.title ?? ''}
              </a>
            )}
        </div>
        {ad.body == null || ad.body === ''
          ? null
          : (
            <div style={{
              fontSize: 12.5,
              lineHeight: 1.45,
              opacity: 0.72,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {ad.body}
            </div>
          )}
      </div>
      {ctaLabel == null || href == null
        ? null
        : (
          <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', padding: '0 14px 0 6px' }}>
            <a
              href={href}
              target="_blank"
              rel="sponsored noreferrer noopener"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                lineHeight: 1,
                padding: '9px 14px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                color: 'var(--dsw-alias-label-primary-foreground, #fff)',
                background: 'var(--dsw-alias-state-business-primary, #3b6cf6)',
              }}
            >
              {ctaLabel}
            </a>
          </div>
        )}
      <button
        type="button"
        aria-label={t('Dismiss this placement')}
        title={t('Dismiss')}
        onClick={() => setDismissed(turn)}
        style={{
          position: 'absolute',
          top: 4,
          right: 6,
          background: 'transparent',
          border: 0,
          color: 'inherit',
          opacity: 0.45,
          cursor: 'pointer',
          fontSize: 15,
          lineHeight: 1,
          padding: 2,
        }}
      >
        ×
      </button>
    </aside>
  )
}
