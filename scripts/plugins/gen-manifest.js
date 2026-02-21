/* eslint-disable no-await-in-loop */
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @param {string} path
 * @returns {Plugin}
 */
export default function genManifest(path) {
  return {
    name: 'gen-manifest',
    buildStart() {
      this.addWatchFile(path)
    },
    async generateBundle() {
      const url = pathToFileURL(path) + `?t=${Date.now()}`

      /** @type {Record<string, any>} */
      const manifest = (await import(url)).default
      const dir = dirname(path)

      /**
       * Treat relative paths in manifest as assets.
       *
       * @param {Record<string, any>} obj
       */
      const processAsset = async (obj) => {
        for (const k in obj) {
          const v = obj[k]

          if (
            typeof v === 'string' &&
            /^\.{1,2}\/.*\.(?:svg|png|jpe?g|gif|webp)$/.test(v)
          ) {
            const assetPath = resolve(dir, v)
            const name = basename(assetPath)

            const source = await this.fs.readFile(assetPath)

            obj[k] = this.getFileName(
              this.emitFile({
                type: 'asset',
                name,
                source,
              }),
            )
          } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            await processAsset(v)
          }
        }
      }

      await processAsset(manifest)

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      })
    },
  }
}
