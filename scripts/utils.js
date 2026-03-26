import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const cwd = process.cwd()

/**
 * @param {...string} args
 * @returns {string}
 */
export function r(...args) {
  return path.resolve(cwd, ...args)
}

export const isDev = process.env.NODE_ENV !== 'production'

export const isFirefoxEnv = process.env.EXTENSION === 'firefox'

export const isCI = process.env.CI === 'true'

export const commitShortHash = process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'

export const outDir = isFirefoxEnv ? r('dist/firefox') : r('dist/chrome')

export const target = 'baseline widely available with downstream'

export const extProtocol = isFirefoxEnv
  ? 'moz-extension://'
  : 'chrome-extension://'

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}

/**
 * @param {string} dir
 * @returns {Promise<string | undefined>}
 */
export function ensureDir(dir) {
  return fs.mkdir(dir, { recursive: true })
}

/**
 * @param {string} filePath
 * @return {Promise<void>}
 */
export async function ensureFile(filePath) {
  try {
    await fs.access(filePath)
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, '')
  }
}
