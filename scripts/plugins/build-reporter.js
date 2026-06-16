import path from 'node:path'
import { styleText } from 'node:util'
import { formatBytes } from '../utils'

/**
 * @returns {import('vite').Plugin}
 */
export default function buildReporter() {
  let startTime = 0
  let isFirstBuild = true
  let isWatch = false

  return {
    name: 'build-reporter',
    apply: 'build',

    config(userConfig) {
      isWatch = !!userConfig.build?.watch

      if (isWatch) {
        return {
          logLevel: 'warn',
        }
      }
    },

    watchChange(id, event) {
      const relPath = path.posix.relative(
        process.cwd().replaceAll('\\', path.posix.sep),
        id.replaceAll('\\', path.posix.sep),
      )

      console.log(
        getTimeString(),
        styleText('green', event.event.padEnd(6)),
        relPath,
      )
    },

    buildStart() {
      startTime = Date.now()
      if (isWatch && isFirstBuild) {
        console.log(getTimeString(), styleText('green', 'building...'))
      }
    },

    writeBundle: {
      order: 'post',
      async handler(outputOptions, bundle) {
        isFirstBuild = false

        if (isWatch) {
          const duration = Date.now() - startTime
          console.log(
            getTimeString(),
            styleText('green', 'built'.padEnd(6)),
            `${duration}ms`,
          )
        } else {
          const totalBytes = sumBundleSize(bundle)
          console.log(
            styleText('green', '  total size:'),
            styleText('gray', formatBytes(totalBytes)),
          )
        }
      },
    },
  }
}

/**
 * @param {import('vite').Rolldown.OutputBundle} bundle
 * @returns {number}
 */
function sumBundleSize(bundle) {
  let total = 0
  for (const item of Object.values(bundle)) {
    if (item.type === 'chunk') {
      total += new TextEncoder().encode(item.code).length
    } else {
      total +=
        item.source instanceof Uint8Array
          ? item.source.length
          : new TextEncoder().encode(item.source).length
    }
  }
  return total
}

function getTimeString() {
  return styleText(
    'gray',
    new Date().toLocaleTimeString('en-US', {
      hour12: false,
    }),
  )
}
