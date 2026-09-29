// Copies the production build (web/dist) to the repository root, where
// GitHub Pages ("Deploy from a branch", folder "/ (root)") serves it.
// Runs as part of `npm run build`. The root copy is generated: edit web/, not it.

import { cpSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = fileURLToPath(new URL('..', import.meta.url))
const dist = join(web, 'dist')
const root = join(web, '..')

// Never let a build file land on top of the repo's own files.
const PROTECTED = new Set(['.git', '.github', 'web', 'firmware', 'README.md', '.nojekyll'])

// Hashed bundles change name on every build; clear the old ones first.
rmSync(join(root, 'assets'), { recursive: true, force: true })

for (const name of readdirSync(dist)) {
  if (PROTECTED.has(name)) throw new Error(`Refusing to overwrite ${name} in the repo root`)
  cpSync(join(dist, name), join(root, name), { recursive: true })
}

console.log(`Published site copied to the repo root: ${readdirSync(dist).join(', ')}`)
