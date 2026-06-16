import postcss from 'postcss'
import { extProtocol } from '../utils.js'

/**
 * @returns {import("rolldown").Plugin}
 */
export default function cssLoader() {
  const globalRulesRoot = postcss.root()

  return {
    name: 'css-loader',
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
        fileName: 'global.css',
        source: globalRulesRoot.toResult().css,
      })
    },
  }
}

/**
 * Renames all CSS variables with the `--tw-` prefix to `<prefix>` to avoid conflicts with host page tailwind v3 variables.
 *
 * @param {import("postcss").Root} root
 * @param {string} prefix
 */
function renameTwPrefix(root, prefix = '--_ext-tw-') {
  root.walkDecls(/^--tw-/, (decl) => {
    decl.prop = decl.prop.replace(/^--tw-/, prefix)
  })
  root.walkDecls((decl) => {
    decl.value = decl.value.replace(/--tw-/g, prefix)
  })
  root.walkAtRules('property', (atRule) => {
    atRule.params = atRule.params.replace(/^--tw-/, prefix)
  })
}
