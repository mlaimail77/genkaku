// GENKAKU: LP-JSON wire primitives (protocol v0).
// 4-byte big-endian length prefix + UTF-8 JSON. Frame codec is streamable:
// sessions START before the peer finishes writing (tokens keep flowing after
// the open envelope), so reads must increment — never drain-to-EOS.
// A sink may only be attached ONCE per libp2p stream; all writes to one stream
// go through a WriteQueue whose async generator never ends until .end().

export function lpEncode(obj: unknown): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(obj) + '\n')
  const head = new Uint8Array(4)
  new DataView(head.buffer).setUint32(0, body.byteLength)
  const out = new Uint8Array(head.length + body.length)
  out.set(head); out.set(body, head.length)

  return out
}

export type ByteChunk = Uint8Array | { subarray(): Uint8Array }

function toU8(c: ByteChunk): Uint8Array {
  if (c instanceof Uint8Array) {return c}

  return c.subarray()
}

type FrameParse = { frames: unknown[]; consumed: number }

function parseFrames(buf: Uint8Array): FrameParse {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const frames: unknown[] = []
  let p = 0

  while (p + 4 <= buf.length) {
    const len = dv.getUint32(p)

    if (len === 0 || p + 4 + len > buf.length) {break}

    try { frames.push(JSON.parse(new TextDecoder().decode(buf.subarray(p + 4, p + 4 + len)))) } catch { /* tolerate */ }
    p += 4 + len
  }

  return { frames, consumed: p }
}

/** Parse every COMPLETE frame in a byte blob (tests / whole-stream reads). */
export function lpFrames(chunks: ByteChunk[]): unknown[] {
  const parts: Uint8Array[] = []
  let total = 0

  for (const c of chunks) {
    const u = toU8(c)
    parts.push(u)
    total += u.length
  }

  const buf = new Uint8Array(total)
  let off = 0

  for (const u of parts) {buf.set(u, off); off += u.length}

  return parseFrames(buf).frames
}

/**
 * Incremental frame reader — feeds whatever bytes arrive and pops complete
 * frames WITHOUT waiting for stream end.
 */
export class FrameReader {
  private buf = new Uint8Array(0)

  push(chunk: ByteChunk): void {
    const u = toU8(chunk)
    const merged = new Uint8Array(this.buf.length + u.length)
    merged.set(this.buf)
    merged.set(u, this.buf.length)
    this.buf = merged
  }

  /** next complete frame, or undefined while the current one is still partial */
  next(): unknown | undefined {
    const { frames, consumed } = parseFrames(this.buf)

    if (frames.length === 0) {return undefined}
    this.buf = this.buf.subarray(consumed)

    return frames[0]
  }
}

/**
 * One durable write side per stream: `sink(queue.source())` once, then push
 * frames as they happen; the write half stays open until .end().
 */
export class WriteQueue {
  private items: Uint8Array[] = []
  private waiters: Array<() => void> = []
  /** end() has been called — readers will see EOF after draining the items */
  ended = false

  push(b: Uint8Array): void {
    if (this.ended) {return}
    this.items.push(b)
    this.drain()
  }

  end(): void {
    this.ended = true
    this.drain()
  }

  private drain(): void {
    for (const w of this.waiters.splice(0)) {w()}
  }

  async *source(): AsyncGenerator<Uint8Array> {
    while (true) {
      while (this.items.length > 0) {yield this.items.shift() as Uint8Array}

      if (this.ended) {return}
      await new Promise<void>(resolve => this.waiters.push(resolve))
    }
  }
}
