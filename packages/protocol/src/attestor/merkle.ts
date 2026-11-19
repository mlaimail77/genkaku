// A Merkle root over a day's evidence.
//
// The reputation account has 32 bytes for "the evidence this score came from".
// The evidence itself is small — a handful of lines per worker per day — so the
// attestor publishes the lines in its report and commits to their Merkle root on
// chain. Anyone holding the lines can recompute the root and check that the
// numbers in the account are the numbers that were attested.
//
// The tree is a plain binary Merkle over sha256 leaves with odd nodes promoted,
// which is the simplest thing that is unambiguous: a verifier does not have to
// know our duplicate-node convention to reproduce it.

import { createHash } from 'node:crypto'

function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest()
}

/** The leaf hash for one evidence line: `sha256(0x00 || line)`. The prefix keeps
 *  a leaf from ever being mistaken for an internal node. */
export function leafHash(line: string): Buffer {
  return sha256(Buffer.concat([Buffer.from([0x00]), Buffer.from(line, 'utf8')]))
}

/** The parent of two nodes: `sha256(0x01 || left || right)`. */
function nodeHash(left: Buffer, right: Buffer): Buffer {
  return sha256(Buffer.concat([Buffer.from([0x01]), left, right]))
}

/**
 * Root of the evidence tree.
 *
 * Empty evidence is all-zero rather than the hash of nothing: a zero root is
 * visibly "no evidence", and it is what an unattested day would carry.
 */
export function evidenceRoot(lines: readonly string[], rootOf?: (leaves: Buffer[]) => Buffer): Uint8Array {
  if (lines.length === 0) return new Uint8Array(32)

  let level = [...lines].sort().map(leafHash)

  while (level.length > 1) {
    const next: Buffer[] = []

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!
      const right = level[i + 1]

      next.push(right == null ? left : nodeHash(left, right))
    }

    level = next
  }

  return new Uint8Array((rootOf == null ? level[0]! : rootOf(level)))
}

/** Same input, same root — the property the whole scheme rests on. */
export function verifyRoot(lines: readonly string[], root: Uint8Array): boolean {
  const computed = evidenceRoot(lines)

  if (computed.length !== root.length) return false

  return Buffer.compare(Buffer.from(computed), Buffer.from(root)) === 0
}
