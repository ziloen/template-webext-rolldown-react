import postcss from 'postcss'
import { extProtocol } from '../utils.js'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @returns {Plugin}
 */
export default function cssLoader() {
  // const processor = postcss([
  //   tailwindcss,
  //   postcssPresetEnv({ browsers: target }),
  // ])
  const globalRulesRoot = postcss.root()

  return {
    name: 'css-loader',
    // transform: {
    //   filter: {
    //     id: {
    //       include: /\.(?:css|scss)$/,
    //       exclude: /node_modules/,
    //     },
    //   },
    //   order: 'post',
    //   async handler(code, id, meta) {
    //     // FIXME: tailwind 运行了两次？
    //     // TODO: support css modules

    //     const sassResult = id.endsWith('.scss')
    //       ? await compileStringAsync(code, {
    //           url: new URL(`file://${id}`),
    //           sourceMap: false,
    //         })
    //       : null

    //     if (sassResult?.loadedUrls.length) {
    //       for (const filePath of sassResult.loadedUrls
    //         .filter((url) => url.protocol === 'file:')
    //         .map((url) => fileURLToPath(url))) {
    //         this.addWatchFile(filePath)
    //       }
    //     }

    //     const cssCode = sassResult ? sassResult.css : code

    //     const postcssResult = await processor.process(cssCode, {
    //       from: id,
    //       to: id,
    //       map: false,
    //     })

    //     // FIXME: Tailwind v4 会将所有文件都列入 dependency
    //     // for (const file of postcssResult.messages
    //     //   .filter((msg) => msg.type === 'dependency')
    //     //   .map((msg) => msg.file)) {
    //     //   this.addWatchFile(file)
    //     // }

    //     return {
    //       code: postcssResult.css,
    //       map: { mappings: '' },
    //     }
    //   },
    // },
    async generateBundle(_, bundle) {
      for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
        if (!fileName.endsWith('.css')) continue

        const code =
          chunkOrAsset.type === 'chunk'
            ? chunkOrAsset.code
            : /** @type {string} */ (chunkOrAsset.source)

        const result = postcss.parse(code)

        // Add prefix to all URLs in src attributes
        result.walkDecls(/^(?:src|background-image)$/, (decl, index) => {
          decl.value = decl.value.replace(
            /url\((['"]?)\/?assets\//g,
            `url($1${extProtocol}__MSG_@@extension_id__/assets/`,
          )
        })

        // Extract global at-rules
        result.walkAtRules(/^(?:property|font-face)$/, (atRule) => {
          atRule.remove()
          globalRulesRoot.append(atRule.clone())
        })

        const newCode = result.toResult().css

        if (chunkOrAsset.type === 'chunk') {
          chunkOrAsset.code = newCode
        } else {
          chunkOrAsset.source = newCode
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'global-rules.css',
        source: globalRulesRoot.toResult().css,
      })
    },
  }
}
