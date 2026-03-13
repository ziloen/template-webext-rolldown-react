import { transform } from '@svgr/core'
import jsxPlugin from '@svgr/plugin-jsx'
import { glob } from 'node:fs/promises'
import path from 'node:path'

/**
 * @import { Plugin } from "rolldown"
 */

const moduleId = '~icons'
const subModulePrefix = moduleId + ':'
const resolvedModuleId = '\0' + moduleId
const resolvedSubModulePrefix = '\0' + subModulePrefix
/**
 * @type {Map<string, string>}
 * { IconName => 'C:\\path\\to\\icon.svg' }
 */
const iconPathMap = new Map()

/**
 * @typedef {Object} PluginOptions
 * @property {string} [iconNamePrefix="Icon"] Prefix for icon names
 * @property {string} [iconDir="src/icons"] Directory containing SVG icons
 * @property {string} [dtsPath="src/types/icons.d.ts"] Path for the generated TypeScript declaration file
 */

/**
 * @param {PluginOptions} optiopns
 * @returns {Plugin}
 */
export default function SvgIcon(optiopns) {
  const CWD = process.cwd()
  const iconNamePrefix = optiopns.iconNamePrefix ?? 'Icon'
  const iconsDir = path.resolve(CWD, optiopns.iconDir ?? 'src/icons')
  const dtsFilePath = path.resolve(
    CWD,
    optiopns.dtsPath ?? 'src/types/icons.d.ts',
  )

  return {
    name: 'svg-icon',

    async buildStart(options) {
      // scan the icons directory
      for await (const entry of glob('**/*.svg', { cwd: iconsDir })) {
        const iconName = iconNamePrefix + iconEntryToName(entry)
        const iconPath = path.join(iconsDir, entry)
        iconPathMap.set(iconName, iconPath)
      }

      // generate type declaration file
      const dtsContent =
        "declare module '~icons' {\n  type SvgComponent = React.FC<React.ComponentProps<'svg'>>\n" +
        Array.from(iconPathMap.keys())
          .sort((a, b) => a.localeCompare(b))
          .map((iconName) => `  export const ${iconName}: SvgComponent`)
          .join('\n') +
        '\n}\n'

      await this.fs.mkdir(path.dirname(dtsFilePath), { recursive: true })
      await this.fs.writeFile(dtsFilePath, dtsContent, { encoding: 'utf8' })
    },

    resolveId: {
      filter: {
        id: /^~icons/,
      },
      handler(source) {
        // ~icons
        if (source === moduleId) {
          return resolvedModuleId
        }

        // ~icons:IconName
        if (source.startsWith(subModulePrefix)) {
          return `\0${source}`
        }

        return null
      },
    },

    load: {
      filter: {
        id: /^\0~icons/,
      },
      async handler(id) {
        // ~icons
        if (id === resolvedModuleId) {
          const exports = Array.from(iconPathMap.keys())
            .map((name) => {
              return `export { default as ${name} } from '${subModulePrefix}${name}'`
            })
            .join('\n')

          return {
            code: exports,
            moduleType: 'js',
            moduleSideEffects: false,
          }
        }

        // ~icons:IconName
        if (id.startsWith(resolvedSubModulePrefix)) {
          const name = id.slice(resolvedSubModulePrefix.length)
          const filePath = iconPathMap.get(name)

          if (!filePath) {
            throw new Error(`Icon "${name}" not found.`)
          }

          this.addWatchFile(filePath)

          const svg = await this.fs.readFile(filePath, { encoding: 'utf8' })

          const componentCode = await transform(
            svg,
            {
              plugins: [jsxPlugin],
              jsxRuntime: 'automatic',
              exportType: 'default',
              icon: false,
              typescript: false,
              svgo: false,
            },
            {
              componentName: name,
              filePath: filePath,
            },
          ).catch(() => 'export default () => null')

          return {
            code: componentCode,
            moduleType: 'jsx',
            moduleSideEffects: false,
          }
        }

        return null
      },
    },
  }
}

/**
 * @param {string} svg
 * @returns {string}
 */
function svgToDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * @param {string} entry
 * @returns {string}
 */
function iconEntryToName(entry) {
  return entry
    .replace(/\.svg$/, '')
    .split(/[-/\\]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
