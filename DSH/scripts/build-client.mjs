#!/usr/bin/env node
/**
 * Bundle a plugin's browser half into the loader artifact dsh expects.
 *
 * dsh's own preset lives inside its monorepo and is not published, so this
 * reproduces the one thing that matters: a factory registered on
 * window.__ModuleLoader__ that resolves React and the dsh client packages
 * through the loader's injected require.
 *
 *   node scripts/build-client.mjs packages/worker @genkaku/dsh-worker-plugin
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [pkgDir, id] = process.argv.slice(2)
if (pkgDir === undefined || id === undefined) {
  console.error('usage: build-client.mjs <package-dir> <bundle-id>')
  process.exit(1)
}

const out = await build({
  entryPoints: [join(pkgDir, 'src/client/index.tsx')],
  loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: false,
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
    '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-layout/client'],
  logLevel: 'warning',
})

const body = out.outputFiles[0].text
mkdirSync(join(pkgDir, 'lib'), { recursive: true })
const wrapped = `window.__ModuleLoader__.load({\n\tid: ${JSON.stringify(id)},\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;\n${body}\n\t\treturn module.exports;\n\t}\n});\n`
writeFileSync(join(pkgDir, 'lib/client.js'), wrapped)
console.log(`${id}: ${wrapped.length} bytes -> ${pkgDir}/lib/client.js`)
