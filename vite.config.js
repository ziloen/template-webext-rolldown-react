import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { babel } from './scripts/plugins/babel.js'
import cssLoader from './scripts/plugins/css-loader.js'
import genHtml from './scripts/plugins/gen-html.js'
import genManifest from './scripts/plugins/gen-manifest.js'
import { isCI, isDev, isFirefoxEnv, outDir, r } from './scripts/utils.js'

export default defineConfig({
  plugins: [
    babel(),
    react(),
    tailwindcss({ optimize: true }),
    genManifest(r('scripts/manifest.ts')),
    cssLoader(),
    genHtml({ templateHtmlPath: r('src/pages/index.html') }),
  ],
  define: {
    IS_FIREFOX_ENV: isFirefoxEnv,
    IS_DEV: isDev,
    IS_PROD: !isDev,
  },
  build: {
    outDir,
    sourcemap: isDev ? 'inline' : false,
    minify: !isDev,
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
        chunkFileNames: isDev ? 'assets/[name].js' : 'assets/[hash].js',
        assetFileNames: (chunkInfo) => {
          const name = chunkInfo.names[0]
          const originalFileName = chunkInfo.originalFileNames[0]

          if (!name.endsWith('.css')) {
            return isDev ? 'assets/[name][extname]' : 'assets/[hash][extname]'
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
  },
  // devtools: {
  //   enabled: true,
  // },
})
