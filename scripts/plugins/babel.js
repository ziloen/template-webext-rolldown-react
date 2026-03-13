import { transformAsync } from '@babel/core'
import presetEnv from '@babel/preset-env'
import { valueToNode } from '@babel/types'
import { difference } from 'es-toolkit'
import { createRequire } from 'node:module'
import { target } from '../utils.js'

/**
 * @import { TransformOptions } from "@babel/core"
 */

/** @type {import("babel-plugin-annotate-module-pure").Options["pureCalls"]} */
export const PURE_CALLS = {
  axios: [['default', 'create']],
  classnames: ['default'],
  clsx: ['default', 'clsx'],
  'clsx/lite': ['default', 'clsx'],
  'es-toolkit': ['clamp', 'mapValues', 'noop'],
  'lodash-es': [
    'clamp',
    'clone',
    'debounce',
    'escapeRegExp',
    'findIndex',
    'identity',
    'inRange',
    'isBoolean',
    'isEmpty',
    'isEqual',
    'isFunction',
    'isNil',
    'isPlainObject',
    'memoize',
    'noop',
    'pickBy',
    'throttle',
  ],
  'mobx-react': ['observer'],
  'mobx-react-lite': ['observer'],
  react: [
    'cloneElement',
    'createContext',
    'createElement',
    'createFactory',
    'createRef',
    'forwardRef',
    'isValidElement',
    'lazy',
    'memo',
  ],
  'react-dom': ['createPortal'],
  rxjs: ['fromEventPattern', 'share', 'Subject'],
  'rxjs/operators': ['share'],
  'serialize-error': ['deserializeError', 'serializeError'],
  'tailwind-merge': ['twMerge', 'extendTailwindMerge'],
  uuid: ['v4', 'v7'],
  'webextension-polyfill': [
    ['default', 'i18n', 'detectLanguage'],
    ['default', 'runtime', 'getManifest'],
    ['default', 'runtime', 'getURL'],
    ['default', 'tabs', 'query'],
    ['i18n', 'detectLanguage'],
    ['runtime', 'getManifest'],
    ['runtime', 'getURL'],
    ['tabs', 'query'],
  ],
  zod: [
    ['z', 'array'],
    ['z', 'boolean'],
    ['z', 'number'],
    ['z', 'object'],
    ['z', 'string'],
  ],
  zustand: ['create'],
  'zustand/middleware': ['combine'],
}

/**
 * @returns {import("rolldown").Plugin}
 */
export function BabelPlugin() {
  const _require = createRequire(import.meta.url)

  /** @type {TransformOptions} */
  const config = {
    babelrc: false,
    configFile: false,
    cloneInputAst: false,
    browserslistConfigFile: false,
    targets: target,
    presets: [
      [
        presetEnv,
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
      // Precompute pure `clsx` calls
      {
        visitor: {
          CallExpression(path, state) {
            const clleePath = path.get('callee')

            if (!(clleePath.isIdentifier() && clleePath.node.name === 'clsx')) {
              return
            }

            const args = path.get('arguments')

            const classNames = []

            for (const arg of args) {
              if (!arg.isStringLiteral()) {
                return
              }
              classNames.push(arg.node.value)
            }

            const clsx = _require('clsx')

            path.replaceWith(valueToNode(clsx(classNames)))
          },
        },
      },
    ],
  }

  return {
    name: 'babel',
    renderChunk: {
      async handler(code, chunk, outputOptions, meta) {
        const result = await transformAsync(code, config)

        if (result) {
          return {
            code: result.code || '',
            map: result.map,
          }
        }

        return null
      },
    },
  }
}

/** @type {string[]} */
export const pureFunctions = difference(
  [
    'Array.isArray',
    'crypto.randomUUID',
    'Date.now',
    'decodeURI',
    'decodeURIComponent',
    'document.createElement',
    'encodeURI',
    'encodeURIComponent',
    'Math.abs',
    'Math.ceil',
    'Math.floor',
    'Math.max',
    'Math.min',
    'Math.pow',
    'Math.random',
    'Math.round',
    'Number.isFinite',
    'Number.isInteger',
    'Number.isNaN',
    'Object.hasOwn',
    'structuredClone',
    'URLPattern',
  ],
  // 有些库会使用这些函数来产生副作用，不能算作纯函数
  ['Array.from', 'Object.entries', 'Object.keys', 'Object.values'],
)
