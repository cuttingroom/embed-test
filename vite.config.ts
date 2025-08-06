import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Function to find the first available certificate pair
function findSSLCertificates() {
  const sslDir = './.ssl'

  try {
    if (!fs.existsSync(sslDir)) {
      return null
    }

    const files = fs.readdirSync(sslDir)
    const certFiles = files.filter(file => file.endsWith('.pem') && !file.endsWith('-key.pem'))

    for (const certFile of certFiles) {
      const keyFile = certFile.replace('.pem', '-key.pem')
      const certPath = path.join(sslDir, certFile)
      const keyPath = path.join(sslDir, keyFile)

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        }
      }
    }

    return null
  } catch (error) {
    console.warn('Error checking SSL certificates:', error)
    return null
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/embed-test/' : '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    ...(() => {
      const sslConfig = findSSLCertificates()
      return sslConfig ? { https: sslConfig } : {}
    })()
  }
})
