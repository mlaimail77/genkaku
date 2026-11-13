// GENKAKU: role mode manager — the D-block enforcement lives HERE and in the
// sidecar (never both a remote-user dialer and a worker listener on one machine).
// Spec: docs/genkaku/P4-ADAPTATION.md §2; user-locked rule 2026-11-06.
//
// Semantics:
//   · "remote session"  = this machine CONSUMES someone else's worker stream
//   · "sharing"         = this machine SERVES its local LLM over libp2p
//   · A user            : may hold remote sessions, never shares
//   · B localPlusSharing: owners use their LOCAL model + share idle capacity
//        ("local use" is not a remote session — no counterparty, no metering)
//   · C workerDedicated : pure serving
//   · D                 : remote-consumption + sharing simultaneously — banned

export type RoleMode = 'user' | 'localPlusSharing' | 'workerDedicated'

export type ModeState = {
  mode: RoleMode
  /** a live remote session consumes another peer's worker this instant */
  remoteUserActive: boolean
  /** this machine exposes /genkaku/* worker protocols on its libp2p node */
  sharingActive: boolean
}

export class ModeError extends Error {
  constructor(msg: string, public readonly code: string) {
    super(`[genkaku:${code}] ${msg}`)
  }
}

export class ModeManager {
  private state: ModeState

  constructor(private readonly onTransition?: (from: RoleMode, to: RoleMode) => void) {
    this.state = { mode: 'localPlusSharing', remoteUserActive: false, sharingActive: false }
  }

  current(): Readonly<ModeState> {
    return { ...this.state }
  }

  /** Enter a role. `remoteUserActive` hints whether a live remote session should
   *  carry over (only meaningful user→user). */
  switch(to: RoleMode, opts: { remoteUserActive?: boolean } = {}): ModeState {
    if (this.state.mode === 'user' && this.state.remoteUserActive && to !== 'user') {
      throw new ModeError('open remote sessions must end before leaving user mode', 'remote-must-drain')
    }

    if (this.state.sharingActive && to === 'user') {
      throw new ModeError('stop worker listening before becoming a remote user', 'sharing-must-drain')
    }

    const sharing = to !== 'user'
    const remote = to === 'user' ? Boolean(opts.remoteUserActive) : false
    const before = this.state.mode
    this.state = { mode: to, remoteUserActive: remote, sharingActive: sharing }
    this.onTransition?.(before, to)

    return { ...this.state }
  }

  /** Sidecar calls at transport start (user mode only; D-block is enforced here). */
  beginRemoteSession(): void {
    if (this.state.mode !== 'user') {
      throw new ModeError('remote consumption is only allowed in dedicated user mode (D-block)', 'd-block')
    }

    if (this.state.sharingActive) {
      throw new ModeError('cannot consume a remote worker while sharing (D-block)', 'd-block')
    }

    this.state.remoteUserActive = true
  }

  endRemoteSession(): void {
    this.state.remoteUserActive = false
  }

  /** Sidecar guard before installing /genkaku/* protocol handlers. */
  installWorkerListeners(): 'installed' | 'already' {
    if (this.state.mode === 'user') {
      throw new ModeError('worker listeners forbidden in user mode (D-block)', 'd-block')
    }

    if (this.state.remoteUserActive) {
      throw new ModeError('still draining a remote session before installing listeners', 'remote-must-drain')
    }

    if (this.state.sharingActive) {return 'already'}
    this.state.sharingActive = true
    this.onTransition?.('user', this.state.mode)

    return 'installed'
  }

  removeWorkerListeners(): void {
    if (this.state.remoteUserActive) {
      throw new ModeError('still draining a remote session before removing listeners', 'remote-must-drain')
    }

    this.state.sharingActive = false
  }
}
