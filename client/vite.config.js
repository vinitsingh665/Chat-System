import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // allow the specific ngrok host and any ngrok-free.dev subdomain
    // replace the string below with your current ngrok host if it changes
    allowedHosts: [
      "unregarded-roderick-pseudoarticulately.ngrok-free.dev",
      ".ngrok-free.dev",
      ".ngrok-free.app",
      "localhost"
    ],
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      },
      '/check-username': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
