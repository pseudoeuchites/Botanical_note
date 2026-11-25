import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function localIdentifyApiPlugin() {
  let apiKey = ''
  return {
    name: 'local-identify-api',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    },
    configureServer(server) {
      server.middlewares.use('/api/identify', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: '.env.local에 GEMINI_API_KEY가 설정되지 않았습니다.' }))
          return
        }

        let rawBody = ''
        req.on('data', (chunk) => {
          rawBody += chunk.toString()
        })

        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(rawBody || '{}')
            const model = parsedBody.model || 'gemini-2.5-flash'
            const payload = parsedBody.payload
            const requestBody = typeof payload === 'string' ? payload : JSON.stringify(payload)

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
              }
            )

            const data = await response.json()
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), localIdentifyApiPlugin()],
})
