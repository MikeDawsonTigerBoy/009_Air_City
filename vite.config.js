import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative paths, so the build also runs from a sub-folder such as the portfolio's /air-city/
export default defineConfig({ base: './', plugins: [react()] })
