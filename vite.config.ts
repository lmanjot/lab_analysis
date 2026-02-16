import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Map Vercel env vars so they're available client-side.
    // Vite only auto-exposes VITE_-prefixed vars, so we bridge them here.
    __GOAUTHID__: JSON.stringify(process.env.goauthid ?? ''),
    __GOAUTHSECRET__: JSON.stringify(process.env.goauthsecret ?? ''),
    __GOPROJECTID__: JSON.stringify(process.env.goprojectid ?? ''),
    __GOLOCATION__: JSON.stringify(process.env.golocation ?? ''),
  },
})
