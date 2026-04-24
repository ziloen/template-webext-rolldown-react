import path from 'node:path'
import { isDev, r } from '../utils.js'

/**
 * @import { Plugin } from "vite"
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

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue
        if (!chunk.name.startsWith('pages/')) continue
        if (!chunk.facadeModuleId?.endsWith('.tsx')) continue

        const entryName = path.basename(chunk.name)
        const suffix = isDev ? `?t=${Date.now()}` : ''

        const htmlCode = templateHtml
          .replace(
            '<!-- __MAIN_SCRIPT__ -->',
            `<script type="module" src="./${entryName}.js"></script>`,
          )
          .replace(
            '<!-- __MAIN_CSS__ -->',
            bundle[`${chunk.name}.css`]
              ? `<link rel="stylesheet" href="./${entryName}.css${suffix}">`
              : '',
          )
          .replace('/styles.css', `/styles.css${suffix}`)

        this.emitFile({
          type: 'asset',
          fileName: `${chunk.name}.html`,
          source: htmlCode,
          name: 'index.html',
        })
      }
    },
  }
}
