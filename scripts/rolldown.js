import { babel } from '@rollup/plugin-babel'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { mapValues } from 'es-toolkit'
import { createRequire } from 'node:module'
import { styleText } from 'node:util'
import { build, watch } from 'rolldown'
import copy from 'rollup-plugin-copy'
import { PURE_CALLS, pureFunctions } from './plugins/babel.js'
import cssLoader from './plugins/css-loader.js'
import genHtml from './plugins/gen-html.js'
import genManifest from './plugins/gen-manifest.js'
import importSuffix from './plugins/import-suffix.js'
import {
  extProtocol,
  formatBytes,
  isCI,
  isDev,
  isFirefoxEnv,
  outDir,
  r,
} from './utils.js'

/**
 * @import { BuildOptions, RolldownOutput } from "rolldown"
 */

const cwd = process.cwd()
const target = 'baseline widely available with downstream'

const _require = createRequire(import.meta.url)

// FIXME: 多个 input config 会导致共用的 asset 被重复打包多次
// 例如如果有多个 entry 都 import 了 a.png，那么 a.png 会被打包多次 a.hash1.png, a.hash2.png
// TODO: 支持 sass 文件
// TODO: 支持 在同一个 config 下部分 entry 使用单文件形式（不分包）
/**
 * @type {BuildOptions}
 */
const buildOptions = {
  platform: 'browser',
  transform: {
    target: browserslistToEsbuild(target),
    define: mapValues(
      {
        IS_FIREFOX_ENV: isFirefoxEnv,
        IS_DEV: isDev,
        IS_PROD: !isDev,
      },
      (v) => JSON.stringify(v),
    ),
    dropLabels: [],
    jsx: {
      development: isDev,
    },
  },
  resolve: {
    // https://webpack.js.org/configuration/resolve/#resolvealias
    alias: {
      '~ext-root$': `${extProtocol}__MSG_@@extension_id__`,
    },
  },
  external: [
    // https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Internationalization#predefined_messages
    'moz-extension://__MSG_@@extension_id__/*',
    'chrome-extension://__MSG_@@extension_id__/*',
  ],
  moduleTypes: {
    '.jpg': 'asset',
    '.png': 'asset',
    '.woff': 'asset',
    '.woff2': 'asset',
  },
  optimization: {
    inlineConst: isDev
      ? false
      : {
          mode: 'smart',
          pass: 3,
        },
  },
  treeshake: {
    manualPureFunctions: pureFunctions,
    moduleSideEffects: [
      {
        test: /node_modules[\\/]react[\\/]index\.js/,
        sideEffects: false,
      },
    ],
  },
  logLevel: 'info',
  experimental: {
    attachDebugInfo: isDev ? 'full' : 'none',
    nativeMagicString: true,
    // lazyBarrel: true,
  },

  input: {
    // TODO: 使用 advancedChunks 来直接提取 common.css
    background: r('src/background/background.ts'),
    common: r('src/styles/common.css'),
    'content-scripts/main': r('src/content-scripts/main.tsx'),
    'content-scripts/start': r('src/content-scripts/start.ts'),
    'devtools/devtools': r('src/devtools/devtools.ts'),
    'pages/devtools': r('src/pages/devtools/main.tsx'),
    'pages/options': r('src/pages/options/main.tsx'),
    'pages/popup': r('src/pages/popup/main.tsx'),
    'pages/sidebar': r('src/pages/sidebar/main.tsx'),
    ...((isCI || isDev) && {
      'pages/test-page': r('src/pages/test-page/main.tsx'),
    }),
  },
  output: {
    format: 'esm',
    // FIXME: clean: true 会导致 copy 插件的文件被删除
    // https://github.com/rolldown/rolldown/issues/6733
    cleanDir: false,
    dir: outDir,
    legalComments: 'inline',
    sourcemap: isDev ? 'inline' : false,
    hashCharacters: 'hex',
    assetFileNames: 'assets/[name].[hash][extname]',
    chunkFileNames: 'assets/[name].[hash].js',
    minify: !isDev,
  },
  plugins: [
    // FIXME: use filter to exclude node_modules
    // TODO: is it possible to transform after jsx and typescript compilation? use renderChunk?
    babel({
      babelHelpers: 'bundled',
      configFile: false,
      babelrc: false,
      cloneInputAst: false,
      skipPreflightCheck: true,
      targets: target,
      parserOpts: {
        plugins: ['jsx', 'typescript'],
      },
      presets: [
        [
          '@babel/preset-env',
          {
            targets: target,
            useBuiltIns: 'usage',
            corejs: {
              version: _require('core-js/package.json').version,
              proposals: false,
            },
            shippedProposals: true,
            ignoreBrowserslistConfig: true,
            bugfixes: true,
            loose: false,
            modules: false,
          },
        ],
      ],
      plugins: [
        [
          'babel-plugin-annotate-module-pure',
          {
            pureCalls: PURE_CALLS,
          },
        ],
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      exclude: /node_modules/,
    }),
    copy({
      cwd: cwd,
      flatten: false,
      targets: [
        { src: 'public/**/*', dest: outDir },
        { src: 'src/devtools/index.html', dest: outDir },
      ],
    }),
    importSuffix(),
    genManifest(r('scripts/manifest.ts')),
    cssLoader(),
    genHtml({ templateHtmlPath: r('src/pages/index.html') }),
  ],
}

/**
 * @param {RolldownOutput | RolldownOutput[]} results
 */
function logBuildResult(results) {
  let totalSize = 0
  let longestFileName = 0
  let longestSizeText = 0

  const outputs = (Array.isArray(results) ? results : [results])
    .flatMap((result) => {
      return result.output.map((out) => {
        const content = out.type === 'chunk' ? out.code : out.source
        const byteLength = Buffer.byteLength(content, 'utf-8')
        const sizeText = formatBytes(byteLength)

        totalSize += byteLength
        longestFileName = Math.max(longestFileName, out.fileName.length)
        longestSizeText = Math.max(longestSizeText, sizeText.length)

        return {
          byteLength,
          sizeText: formatBytes(byteLength),
          isEntry: out.type === 'chunk' && out.isEntry,
          ...out,
        }
      })
    })
    .sort((a, b) => {
      const aType = a.type === 'chunk' && a.isEntry ? 'entry' : a.type
      const bType = b.type === 'chunk' && b.isEntry ? 'entry' : b.type
      const priority = {
        entry: 0,
        chunk: 1,
        asset: 1,
      }

      if (priority[aType] !== priority[bType]) {
        return priority[aType] - priority[bType]
      }

      if (a.byteLength !== b.byteLength) {
        return b.byteLength - a.byteLength
      }

      return a.fileName.localeCompare(b.fileName)
    })

  const filenameLength = longestFileName + 2

  for (const out of outputs) {
    out.sizeText = out.sizeText.padStart(longestSizeText)
  }

  for (const out of outputs) {
    const isEntry = out.isEntry

    console.log(
      styleText('gray', isEntry ? 'entry' : 'chunk'),
      styleText(isEntry ? 'blue' : 'green', out.fileName) +
        ` `.padEnd(filenameLength - out.fileName.length),
      styleText('white', out.sizeText),
    )
  }

  // Horizontal rule
  console.log('-'.repeat(filenameLength + longestSizeText + 7))

  const totalText = formatBytes(totalSize)

  console.log(
    styleText('gray', 'total'),
    ' '.repeat(filenameLength - (totalText.length - longestSizeText)),
    styleText('white', totalText),
  )
}

if (isDev) {
  const watcher = watch(buildOptions)

  let time = 0
  watcher.on('event', (data) => {
    if (data.code.includes('_')) {
      return
    }

    if (data.code === 'ERROR') {
      console.error('[watch]', data.error)
      return
    }

    if (data.code === 'START') {
      time = performance.now()
    }

    const buildTime = (performance.now() - time).toFixed(2)

    console.log(
      styleText('cyan', '[watch]'),
      styleText('green', data.code),
      data.code === 'END' ? `in ${buildTime}ms` : '',
    )
  })

  watcher.on('change', (e, change) => {
    console.log(
      styleText('cyan', '[watch]'),
      styleText('green', change.event),
      e.slice(cwd.length + 1),
    )
  })
} else {
  // TODO: generate metadata.json to analyze the bundle
  const results = await build(buildOptions)

  logBuildResult(results)
}
