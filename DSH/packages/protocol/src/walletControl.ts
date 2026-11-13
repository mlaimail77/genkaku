// GENKAKU: wallet operations shared by both control planes.
//
// The user bridge and the worker status server expose the same four actions —
// export, import, new, mint — against different keys: the buyer's key signs
// escrows, the worker's key signs receipts and binds the directory entry. The
// HTTP shape and the safeguards are identical, so they live here instead of
// being copied into two request handlers that can drift apart.
//
// Key material only ever leaves over the panel CORS gate (see cors.ts), and
// export additionally requires `confirm: true` so a stray click — or a script
// that reached the port without intent — cannot read it.

/** Wallet operations a control plane may offer. */
export type WalletControl = {
  address: () => string
  exportKey: () => string
  importKey: (privateKey: string) => void | Promise<void>
  rotate: () => void | Promise<void>
  /** base-sepolia only; mints MockUSDC to the panel's own address */
  mint?: (amount: bigint) => Promise<string>
  /** worker only: withdraw USDC that settlements accrued to this wallet */
  claim?: () => Promise<string>
}

/** One action's HTTP answer: status code plus JSON body. */
export type WalletActionReply = { status: number; doc: Record<string, unknown> }

/** Validate and run one `/genkaku/wallet/<action>` call. */
export async function runWalletAction(
  action: string,
  body: Record<string, unknown>,
  wallet: WalletControl,
): Promise<WalletActionReply> {
  if (action === 'export') {
    // The key IS the wallet: require an explicit acknowledgement.
    if (body.confirm !== true) return { status: 400, doc: { error: { message: 'export requires confirm: true' } } }

    return {
      status: 200,
      doc: { ok: true, address: wallet.address(), privateKey: wallet.exportKey() },
    }
  }

  if (action === 'import') {
    const key = typeof body.privateKey === 'string' ? body.privateKey.trim() : ''
    if (key === '') return { status: 400, doc: { error: { message: 'privateKey is required' } } }

    try {
      await wallet.importKey(key)
    } catch (error) {
      return { status: 400, doc: { error: { message: error instanceof Error ? error.message : String(error) } } }
    }

    return { status: 200, doc: { ok: true, address: wallet.address(), restarting: true } }
  }

  if (action === 'new') {
    try {
      await wallet.rotate()
    } catch (error) {
      return { status: 500, doc: { error: { message: error instanceof Error ? error.message : String(error) } } }
    }

    return { status: 200, doc: { ok: true, address: wallet.address(), restarting: true } }
  }

  if (action === 'claim') {
    if (wallet.claim == null) {
      return { status: 400, doc: { error: { message: 'claim is only available on a worker' } } }
    }

    try {
      const tx = await wallet.claim()

      return { status: 200, doc: { ok: true, tx } }
    } catch (error) {
      return { status: 500, doc: { error: { message: error instanceof Error ? error.message : String(error) } } }
    }
  }

  if (action === 'mint') {
    if (wallet.mint == null) {
      return { status: 400, doc: { error: { message: 'test USDC mint is only available on base-sepolia' } } }
    }

    const raw = body.amountUsdc === undefined ? '100' : String(body.amountUsdc)
    const amount = Math.round(Number(raw) * 1e6)

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000e6) {
      return { status: 400, doc: { error: { message: 'amountUsdc must be between 0 and 10000' } } }
    }

    try {
      const tx = await wallet.mint(BigInt(amount))

      return { status: 200, doc: { ok: true, tx, amountUsdc: Number(raw) } }
    } catch (error) {
      return { status: 500, doc: { error: { message: error instanceof Error ? error.message : String(error) } } }
    }
  }

  return { status: 404, doc: { error: { message: 'unknown wallet action' } } }
}
