import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' — відносні шляхи, щоб збірка працювала на GitHub Pages
// у підпапці репозиторію (https://user.github.io/repo/) без додаткових налаштувань.
export default defineConfig({
  base: './',
  plugins: [vue()],
})
