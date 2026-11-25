import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

const appVersion = `${Date.now().toString(36)}`

function versionFile(): Plugin {
  return {
    name: 'app-version-file',
    writeBundle(output) {
      const dir = output.dir ?? resolve('dist')
      writeFileSync(resolve(dir, 'version.json'), JSON.stringify({ version: appVersion }))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), versionFile()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
