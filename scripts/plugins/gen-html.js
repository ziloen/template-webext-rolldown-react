import path from 'node:path'
import { isDev, r } from '../utils.js'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @typedef {Object} Options
 * @property {string} templateHtmlPath Path to the HTML template file
 */

/**
 * @param {Options} options
 * @returns {Plugin}
 */
export default function genHtml(options) {
  return {
    name: 'gen-html',
    buildStart() {
      this.addWatchFile(r(options.templateHtmlPath))
    },
    async generateBundle(_, bundle) {
      // Generate HTML files for each page
      const templateHtml = await this.fs.readFile(r(options.templateHtmlPath), {
        encoding: 'utf8',
      })

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue
        if (!fileName.startsWith('pages/')) continue

        const entryName = path.basename(fileName, path.extname(fileName))

        const htmlName = path.posix.join(
          path.posix.dirname(fileName),
          entryName + '.html',
        )

        const suffix = isDev ? `?t=${Date.now()}` : ''

        const htmlCode = templateHtml
          .replace(
            '<!-- __MAIN_SCRIPT__ -->',
            `<script type="module" src="./${entryName}.js"></script>`,
          )
          .replace(
            '<!-- __MAIN_CSS__ -->',
            bundle[`${path.posix.dirname(fileName)}/${entryName}.css`]
              ? `<link rel="stylesheet" href="./${entryName}.css${suffix}">`
              : '',
          )
          .replace('/common.css', `/common.css${suffix}`)

        this.emitFile({
          type: 'asset',
          fileName: htmlName,
          source: htmlCode,
          name: 'index.html',
        })
      }
    },
  }
}
