/**
 * GenKaKu worker plugin — share this machine's Ollama models on the network.
 *
 * The role is pinned here rather than left to a setting: this package is the
 * supply side, and installing it must never start a consumer loop. A machine
 * that wants both installs both plugins, and each owns its own settings
 * document and key directory.
 */

import { defineGenkakuPlugin } from '@genkaku/dsh-runtime'

export const { name, inject, Config, apply } = defineGenkakuPlugin({
  pluginName: 'genkaku-worker',
  settingsNs: 'genkaku-worker',
  role: 'workerDedicated',
})
