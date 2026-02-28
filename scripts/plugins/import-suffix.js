import path from 'node:path'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @returns {Plugin}
 */
export default function importSuffix() {
  const filter = /\?(?:url|raw|inline)$/

  return {
    name: 'import-suffix',

    resolveId: {
      filter: {
        id: filter,
      },
      async handler(source, importer, extraOptions) {
        const suffix = source.match(filter)?.[0]

        if (!suffix) {
          return null
        }

        const resolved = await this.resolve(
          source.slice(0, source.length - suffix.length),
          importer,
          { skipSelf: true },
        )

        if (resolved && !resolved.external) {
          this.addWatchFile(resolved.id)

          return {
            id: resolved.id + suffix,
            meta: {
              resolvedId: resolved.id,
              suffix: suffix,
            },
          }
        }

        return null
      },
    },

    load: {
      filter: {
        id: filter,
      },

      async handler(id) {
        const info = this.getModuleInfo(id)

        if (!info || !info.meta || !info.meta.suffix) {
          return
        }

        const { resolvedId, suffix } =
          /** @type {{resolvedId: string, suffix: string}} */ (info.meta)

        this.addWatchFile(resolvedId)

        if (suffix === '?inline') {
          return {
            // FIXME: https://github.com/rolldown/rolldown/issues/5662
            // code 现在还不支持返回 Buffer，导致 dataurl 的 mimetype 不正确
            code: await this.fs.readFile(resolvedId, { encoding: 'utf8' }),
            moduleType: 'dataurl',
            moduleSideEffects: false,
          }
        }

        const fileBuffer = await this.fs.readFile(resolvedId)
        const fileName = path.basename(resolvedId)
        const referenceId = this.emitFile({
          type: 'asset',
          name: fileName,
          source: fileBuffer,
        })

        return {
          code: `export default import.meta.ROLLUP_FILE_URL_${referenceId}`,
          moduleType: 'js',
          moduleSideEffects: false,
        }
      },
    },
  }
}
