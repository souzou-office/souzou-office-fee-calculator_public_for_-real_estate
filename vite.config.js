import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/souzou-office-fee-calculator_public_for_-real_estate/',  // ← GitHubリポジトリ名に合わせる（GitHub Pages のパス）
})
