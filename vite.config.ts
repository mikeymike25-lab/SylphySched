import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'replace-sw-placeholders',
        closeBundle() {
          const swPath = path.resolve(__dirname, 'dist/firebase-messaging-sw.js')
          if (fs.existsSync(swPath)) {
            let content = fs.readFileSync(swPath, 'utf8')
            content = content
              .replace('__VITE_FIREBASE_API_KEY__', env.VITE_FIREBASE_API_KEY || '')
              .replace('__VITE_FIREBASE_AUTH_DOMAIN__', env.VITE_FIREBASE_AUTH_DOMAIN || '')
              .replace('__VITE_FIREBASE_PROJECT_ID__', env.VITE_FIREBASE_PROJECT_ID || '')
              .replace('__VITE_FIREBASE_STORAGE_BUCKET__', env.VITE_FIREBASE_STORAGE_BUCKET || '')
              .replace('__VITE_FIREBASE_MESSAGING_SENDER_ID__', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
              .replace('__VITE_FIREBASE_APP_ID__', env.VITE_FIREBASE_APP_ID || '')

            fs.writeFileSync(swPath, content, 'utf8')
            console.log('Successfully replaced Firebase config keys in dist/firebase-messaging-sw.js')
          }
        }
      }
    ],
    server: {
      port: 5180,
    },
  }
})
