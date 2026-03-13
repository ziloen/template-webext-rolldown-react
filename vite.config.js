import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import cssLoader from './scripts/plugins/css-loader.js'
import genHtml from './scripts/plugins/gen-html.js'
import genManifest from './scripts/plugins/gen-manifest.js'
import { isCI, isDev, outDir, r } from './scripts/utils.js'

const target = 'baseline widely available with downstream'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss({ optimize: true }),
    genManifest(r('scripts/manifest.ts')),
    cssLoader(),
    genHtml({ templateHtmlPath: r('src/pages/index.html') }),
  ],
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
    rolldownOptions: {
      input: {
        background: r('src/background/background.ts'),
        common: r('src/styles/common.css'),
        'content-scripts/main': r('src/content-scripts/main.tsx'),
        'content-scripts/start': r('src/content-scripts/start.ts'),
        'devtools/devtools': r('src/devtools/devtools.ts'),

        // Pages
        'pages/devtools': r('src/pages/devtools/main.tsx'),
        'pages/options': r('src/pages/options/main.tsx'),
        'pages/popup': r('src/pages/popup/main.tsx'),
        'pages/sidebar': r('src/pages/sidebar/main.tsx'),

        ...((isCI || isDev) && {
          'pages/test-page': r('src/pages/test-page/main.tsx'),
        }),
      },
      output: {
        hashCharacters: 'hex',
        entryFileNames: '[name].js',
        assetFileNames: (chunkInfo) => {
          const name = chunkInfo.names[0]
          const originalFileName = chunkInfo.originalFileNames[0]

          if (!name.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]'
          }

          if (originalFileName === 'src/styles/common.css') {
            return '[name][extname]'
          }

          if (originalFileName.startsWith('src/pages/')) {
            return 'pages/[name][extname]'
          }

          return 'assets/[name][extname]'
        },
      },
    },
  },
  css: {
    transformer: 'lightningcss',
    devSourcemap: true,
    modules: {},
  },
})
