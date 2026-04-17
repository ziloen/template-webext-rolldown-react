import path from 'node:path'
import { styleText } from 'node:util'
import { formatBytes, getDirSize } from '../utils'

/**
 * @returns {import('vite').Plugin}
 */
export default function buildReporter() {
  let startTime = 0
  let isFirstBuild = true
  let isWatch = false
  let outDir = ''

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

    configResolved(resolvedConfig) {
      outDir = resolvedConfig.build.outDir
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

    async closeBundle() {
      isFirstBuild = false

      if (isWatch) {
        const duration = Date.now() - startTime
        console.log(
          getTimeString(),
          styleText('green', 'built'.padEnd(6)),
          `${duration}ms`,
        )
      } else {
        const totalBytes = await getDirSize(outDir)
        console.log(
          styleText('green', '  total size:'),
          styleText('gray', formatBytes(totalBytes)),
        )
      }
    },
  }
}

function getTimeString() {
  return styleText(
    'gray',
    new Date().toLocaleTimeString('en-US', {
      hour12: false,
    }),
  )
}
