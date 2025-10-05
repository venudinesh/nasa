// Use require for Node built-ins to avoid needing @types/node during tsc
// @ts-ignore
const fs = require('fs')
// @ts-ignore
const path = require('path')
// @ts-ignore
const { fileURLToPath } = require('url')
import { describe, it, expect } from 'vitest'

describe('models/manifest.json', () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const manifestPath = path.resolve(__dirname, '../../public/models/manifest.json')
  it('manifest file exists and is valid JSON with models object', () => {
    expect(fs.existsSync(manifestPath)).toBe(true)
  let raw = fs.readFileSync(manifestPath, 'utf8')
  // strip UTF-8 BOM if present
  raw = raw.replace(/^\uFEFF/, '')
  const json = JSON.parse(raw)
    expect(json).toBeTypeOf('object')
    expect(json).toHaveProperty('models')
    expect(typeof json.models).toBe('object')
  })

  it('each model entry maps to an existing file and keys look like slugs', () => {
  let raw = fs.readFileSync(manifestPath, 'utf8')
  raw = raw.replace(/^\uFEFF/, '')
  const json = JSON.parse(raw)
  const models: Record<string, unknown> = (json.models as Record<string, unknown>) || {}
    const seen: Record<string, boolean> = {}
    const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    Object.entries(models).forEach(([slug, relPathUnknown]) => {
      const relPath = String(relPathUnknown)
      expect(slugRe.test(slug)).toBe(true)
      expect(seen[slug]).not.toBe(true)
      seen[slug] = true
      expect(typeof relPath).toBe('string')
      // path should be under /models/
      expect(relPath.startsWith('/models/')).toBe(true)
      const filePath = path.resolve(__dirname, '../../public', relPath.replace(/^\//, ''))
      expect(fs.existsSync(filePath)).toBe(true)
    })
  })
})
